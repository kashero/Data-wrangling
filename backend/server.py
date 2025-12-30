from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'swiftcare-ambulance-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

app = FastAPI(title="SwiftCare - Ambulance Booking API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Enums
class UserRole(str, Enum):
    PATIENT = "patient"
    DRIVER = "driver"

class AmbulanceType(str, Enum):
    BASIC = "basic"
    ICU = "icu"
    NEONATAL = "neonatal"

class BookingStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EN_ROUTE = "en_route"
    ARRIVED = "arrived"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

# Pricing config
AMBULANCE_PRICES = {
    AmbulanceType.BASIC: {"base": 50, "per_km": 10},
    AmbulanceType.ICU: {"base": 150, "per_km": 25},
    AmbulanceType.NEONATAL: {"base": 200, "per_km": 30},
}

# Pydantic Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str
    role: UserRole = UserRole.PATIENT

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: str
    role: UserRole
    created_at: str
    is_available: Optional[bool] = None
    vehicle_number: Optional[str] = None
    ambulance_type: Optional[str] = None
    rating: Optional[float] = None
    total_trips: Optional[int] = None

class DriverUpdate(BaseModel):
    is_available: Optional[bool] = None
    vehicle_number: Optional[str] = None
    ambulance_type: Optional[AmbulanceType] = None
    current_location: Optional[dict] = None

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float

class BookingCreate(BaseModel):
    pickup_location: dict  # {lat, lng, address}
    destination: Optional[dict] = None  # {lat, lng, address}
    ambulance_type: AmbulanceType
    notes: Optional[str] = None
    is_emergency: bool = False

class BookingResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    patient_phone: str
    driver_id: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    vehicle_number: Optional[str] = None
    pickup_location: dict
    destination: Optional[dict] = None
    ambulance_type: str
    status: str
    estimated_fare: float
    notes: Optional[str] = None
    is_emergency: bool
    created_at: str
    accepted_at: Optional[str] = None
    completed_at: Optional[str] = None
    driver_location: Optional[dict] = None
    rating: Optional[int] = None
    review: Optional[str] = None

class RatingCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    review: Optional[str] = None

# Auth helpers
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def calculate_fare(ambulance_type: AmbulanceType, distance_km: float = 5.0) -> float:
    pricing = AMBULANCE_PRICES[ambulance_type]
    return pricing["base"] + (pricing["per_km"] * distance_km)

# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "phone": user_data.phone,
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_available": True if user_data.role == UserRole.DRIVER else None,
        "vehicle_number": None,
        "ambulance_type": None,
        "current_location": None,
        "rating": 5.0 if user_data.role == UserRole.DRIVER else None,
        "total_trips": 0
    }
    
    await db.users.insert_one(user_doc)
    token = create_token(user_id, user_data.role)
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "phone": user_data.phone,
            "role": user_data.role,
            "created_at": user_doc["created_at"],
            "is_available": user_doc["is_available"],
            "vehicle_number": user_doc["vehicle_number"],
            "ambulance_type": user_doc["ambulance_type"],
            "rating": user_doc["rating"],
            "total_trips": user_doc["total_trips"]
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "phone": user["phone"],
            "role": user["role"],
            "created_at": user["created_at"],
            "is_available": user.get("is_available"),
            "vehicle_number": user.get("vehicle_number"),
            "ambulance_type": user.get("ambulance_type"),
            "rating": user.get("rating"),
            "total_trips": user.get("total_trips")
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "phone": user["phone"],
        "role": user["role"],
        "created_at": user["created_at"],
        "is_available": user.get("is_available"),
        "vehicle_number": user.get("vehicle_number"),
        "ambulance_type": user.get("ambulance_type"),
        "rating": user.get("rating"),
        "total_trips": user.get("total_trips")
    }

# Driver Routes
@api_router.put("/driver/profile")
async def update_driver_profile(update: DriverUpdate, user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can update driver profile")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return updated_user

@api_router.put("/driver/location")
async def update_driver_location(location: LocationUpdate, user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can update location")
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"current_location": {"lat": location.latitude, "lng": location.longitude}}}
    )
    
    # Also update active booking if exists
    await db.bookings.update_one(
        {"driver_id": user["id"], "status": {"$in": [BookingStatus.ACCEPTED, BookingStatus.EN_ROUTE, BookingStatus.ARRIVED, BookingStatus.IN_PROGRESS]}},
        {"$set": {"driver_location": {"lat": location.latitude, "lng": location.longitude}}}
    )
    
    return {"message": "Location updated"}

@api_router.get("/driver/available")
async def get_available_drivers(ambulance_type: Optional[AmbulanceType] = None):
    query = {"role": UserRole.DRIVER, "is_available": True}
    if ambulance_type:
        query["ambulance_type"] = ambulance_type
    
    drivers = await db.users.find(query, {"_id": 0, "password": 0}).to_list(100)
    return drivers

# Booking Routes
@api_router.post("/bookings")
async def create_booking(booking_data: BookingCreate, user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Only patients can create bookings")
    
    # Check for active booking
    active = await db.bookings.find_one({
        "patient_id": user["id"],
        "status": {"$nin": [BookingStatus.COMPLETED, BookingStatus.CANCELLED]}
    })
    if active:
        raise HTTPException(status_code=400, detail="You already have an active booking")
    
    booking_id = str(uuid.uuid4())
    estimated_fare = calculate_fare(booking_data.ambulance_type)
    
    booking_doc = {
        "id": booking_id,
        "patient_id": user["id"],
        "patient_name": user["name"],
        "patient_phone": user["phone"],
        "driver_id": None,
        "driver_name": None,
        "driver_phone": None,
        "vehicle_number": None,
        "pickup_location": booking_data.pickup_location,
        "destination": booking_data.destination,
        "ambulance_type": booking_data.ambulance_type,
        "status": BookingStatus.PENDING,
        "estimated_fare": estimated_fare,
        "notes": booking_data.notes,
        "is_emergency": booking_data.is_emergency,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "accepted_at": None,
        "completed_at": None,
        "driver_location": None,
        "rating": None,
        "review": None
    }
    
    await db.bookings.insert_one(booking_doc)
    del booking_doc["_id"]
    return booking_doc

@api_router.get("/bookings")
async def get_bookings(user: dict = Depends(get_current_user)):
    if user["role"] == UserRole.PATIENT:
        bookings = await db.bookings.find(
            {"patient_id": user["id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
    else:
        # Drivers see pending bookings matching their ambulance type + their accepted bookings
        bookings = await db.bookings.find(
            {"$or": [
                {"status": BookingStatus.PENDING, "ambulance_type": user.get("ambulance_type")},
                {"driver_id": user["id"]}
            ]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
    return bookings

@api_router.get("/bookings/pending")
async def get_pending_bookings(user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can view pending bookings")
    
    query = {"status": BookingStatus.PENDING}
    if user.get("ambulance_type"):
        query["ambulance_type"] = user["ambulance_type"]
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort("is_emergency", -1).sort("created_at", 1).to_list(50)
    return bookings

@api_router.get("/bookings/active")
async def get_active_booking(user: dict = Depends(get_current_user)):
    if user["role"] == UserRole.PATIENT:
        booking = await db.bookings.find_one(
            {"patient_id": user["id"], "status": {"$nin": [BookingStatus.COMPLETED, BookingStatus.CANCELLED]}},
            {"_id": 0}
        )
    else:
        booking = await db.bookings.find_one(
            {"driver_id": user["id"], "status": {"$nin": [BookingStatus.COMPLETED, BookingStatus.CANCELLED]}},
            {"_id": 0}
        )
    return booking

@api_router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if user["role"] == UserRole.PATIENT and booking["patient_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return booking

@api_router.put("/bookings/{booking_id}/accept")
async def accept_booking(booking_id: str, user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can accept bookings")
    
    # Check if driver has active booking
    active = await db.bookings.find_one({
        "driver_id": user["id"],
        "status": {"$nin": [BookingStatus.COMPLETED, BookingStatus.CANCELLED]}
    })
    if active:
        raise HTTPException(status_code=400, detail="You already have an active booking")
    
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["status"] != BookingStatus.PENDING:
        raise HTTPException(status_code=400, detail="Booking is no longer available")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "driver_id": user["id"],
            "driver_name": user["name"],
            "driver_phone": user["phone"],
            "vehicle_number": user.get("vehicle_number"),
            "status": BookingStatus.ACCEPTED,
            "accepted_at": datetime.now(timezone.utc).isoformat(),
            "driver_location": user.get("current_location")
        }}
    )
    
    await db.users.update_one({"id": user["id"]}, {"$set": {"is_available": False}})
    
    updated = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    return updated

@api_router.put("/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, status: BookingStatus, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if user["role"] == UserRole.DRIVER and booking["driver_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if user["role"] == UserRole.PATIENT and booking["patient_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {"status": status}
    if status == BookingStatus.COMPLETED:
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        # Make driver available again
        if booking["driver_id"]:
            await db.users.update_one(
                {"id": booking["driver_id"]},
                {"$set": {"is_available": True}, "$inc": {"total_trips": 1}}
            )
    elif status == BookingStatus.CANCELLED:
        if booking["driver_id"]:
            await db.users.update_one({"id": booking["driver_id"]}, {"$set": {"is_available": True}})
    
    await db.bookings.update_one({"id": booking_id}, {"$set": update_data})
    
    updated = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    return updated

@api_router.post("/bookings/{booking_id}/rate")
async def rate_booking(booking_id: str, rating_data: RatingCreate, user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Only patients can rate")
    
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["patient_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if booking["status"] != BookingStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Can only rate completed bookings")
    
    if booking.get("rating"):
        raise HTTPException(status_code=400, detail="Already rated")
    
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"rating": rating_data.rating, "review": rating_data.review}}
    )
    
    # Update driver's average rating
    if booking["driver_id"]:
        driver_bookings = await db.bookings.find(
            {"driver_id": booking["driver_id"], "rating": {"$ne": None}},
            {"rating": 1}
        ).to_list(1000)
        
        if driver_bookings:
            avg_rating = sum(b["rating"] for b in driver_bookings) / len(driver_bookings)
            await db.users.update_one({"id": booking["driver_id"]}, {"$set": {"rating": round(avg_rating, 1)}})
    
    return {"message": "Rating submitted"}

# SOS Emergency booking
@api_router.post("/bookings/sos")
async def create_sos_booking(location: LocationUpdate, user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.PATIENT:
        raise HTTPException(status_code=403, detail="Only patients can create SOS")
    
    # Check for active booking
    active = await db.bookings.find_one({
        "patient_id": user["id"],
        "status": {"$nin": [BookingStatus.COMPLETED, BookingStatus.CANCELLED]}
    })
    if active:
        raise HTTPException(status_code=400, detail="You already have an active booking")
    
    booking_id = str(uuid.uuid4())
    estimated_fare = calculate_fare(AmbulanceType.ICU)  # SOS defaults to ICU
    
    booking_doc = {
        "id": booking_id,
        "patient_id": user["id"],
        "patient_name": user["name"],
        "patient_phone": user["phone"],
        "driver_id": None,
        "driver_name": None,
        "driver_phone": None,
        "vehicle_number": None,
        "pickup_location": {"lat": location.latitude, "lng": location.longitude, "address": "Emergency Location"},
        "destination": None,
        "ambulance_type": AmbulanceType.ICU,
        "status": BookingStatus.PENDING,
        "estimated_fare": estimated_fare,
        "notes": "SOS EMERGENCY - IMMEDIATE RESPONSE REQUIRED",
        "is_emergency": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "accepted_at": None,
        "completed_at": None,
        "driver_location": None,
        "rating": None,
        "review": None
    }
    
    await db.bookings.insert_one(booking_doc)
    del booking_doc["_id"]
    return booking_doc

# Health check
@api_router.get("/")
async def root():
    return {"message": "SwiftCare API is running", "status": "healthy"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "service": "SwiftCare Ambulance Booking"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
