import requests
import sys
import json
from datetime import datetime

class SwiftCareAPITester:
    def __init__(self, base_url="https://swiftcare-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.patient_token = None
        self.driver_token = None
        self.patient_user = None
        self.driver_user = None
        self.test_booking_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, description=""):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        if description:
            print(f"   {description}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "endpoint": endpoint
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e),
                "endpoint": endpoint
            })
            return False, {}

    def test_health_endpoints(self):
        """Test health check endpoints"""
        print("\n=== HEALTH CHECK TESTS ===")
        
        self.run_test("Root Health Check", "GET", "", 200, description="Basic API health check")
        self.run_test("Health Endpoint", "GET", "health", 200, description="Detailed health status")

    def test_patient_auth(self):
        """Test patient authentication flow"""
        print("\n=== PATIENT AUTHENTICATION TESTS ===")
        
        timestamp = datetime.now().strftime('%H%M%S')
        patient_data = {
            "name": f"Test Patient {timestamp}",
            "email": f"patient{timestamp}@test.com",
            "phone": f"+1555{timestamp}",
            "password": "TestPass123!",
            "role": "patient"
        }
        
        # Test patient registration
        success, response = self.run_test(
            "Patient Registration", 
            "POST", 
            "auth/register", 
            200, 
            data=patient_data,
            description="Register new patient account"
        )
        
        if success and 'token' in response:
            self.patient_token = response['token']
            self.patient_user = response['user']
            print(f"   Patient ID: {self.patient_user['id']}")
        
        # Test patient login
        login_data = {
            "email": patient_data["email"],
            "password": patient_data["password"]
        }
        
        success, response = self.run_test(
            "Patient Login", 
            "POST", 
            "auth/login", 
            200, 
            data=login_data,
            description="Login with patient credentials"
        )
        
        if success and 'token' in response:
            self.patient_token = response['token']
        
        # Test get current user
        if self.patient_token:
            self.run_test(
                "Get Patient Profile", 
                "GET", 
                "auth/me", 
                200, 
                token=self.patient_token,
                description="Get current patient profile"
            )

    def test_driver_auth(self):
        """Test driver authentication flow"""
        print("\n=== DRIVER AUTHENTICATION TESTS ===")
        
        timestamp = datetime.now().strftime('%H%M%S')
        driver_data = {
            "name": f"Test Driver {timestamp}",
            "email": f"driver{timestamp}@test.com",
            "phone": f"+1666{timestamp}",
            "password": "TestPass123!",
            "role": "driver"
        }
        
        # Test driver registration
        success, response = self.run_test(
            "Driver Registration", 
            "POST", 
            "auth/register", 
            200, 
            data=driver_data,
            description="Register new driver account"
        )
        
        if success and 'token' in response:
            self.driver_token = response['token']
            self.driver_user = response['user']
            print(f"   Driver ID: {self.driver_user['id']}")
        
        # Test driver login
        login_data = {
            "email": driver_data["email"],
            "password": driver_data["password"]
        }
        
        success, response = self.run_test(
            "Driver Login", 
            "POST", 
            "auth/login", 
            200, 
            data=login_data,
            description="Login with driver credentials"
        )
        
        if success and 'token' in response:
            self.driver_token = response['token']

    def test_driver_profile(self):
        """Test driver profile management"""
        print("\n=== DRIVER PROFILE TESTS ===")
        
        if not self.driver_token:
            print("❌ Skipping driver profile tests - no driver token")
            return
        
        # Update driver profile
        profile_data = {
            "vehicle_number": "AMB-123",
            "ambulance_type": "icu",
            "is_available": True
        }
        
        self.run_test(
            "Update Driver Profile", 
            "PUT", 
            "driver/profile", 
            200, 
            data=profile_data,
            token=self.driver_token,
            description="Update driver vehicle and availability"
        )
        
        # Update driver location
        location_data = {
            "latitude": 40.7128,
            "longitude": -74.0060
        }
        
        self.run_test(
            "Update Driver Location", 
            "PUT", 
            "driver/location", 
            200, 
            data=location_data,
            token=self.driver_token,
            description="Update driver GPS location"
        )
        
        # Get available drivers
        self.run_test(
            "Get Available Drivers", 
            "GET", 
            "driver/available", 
            200,
            description="List all available drivers"
        )

    def test_booking_flow(self):
        """Test complete booking flow"""
        print("\n=== BOOKING FLOW TESTS ===")
        
        if not self.patient_token:
            print("❌ Skipping booking tests - no patient token")
            return
        
        # Create booking
        booking_data = {
            "pickup_location": {
                "lat": 40.7128,
                "lng": -74.0060,
                "address": "Test Pickup Location"
            },
            "destination": {
                "lat": 40.7589,
                "lng": -73.9851,
                "address": "Test Hospital"
            },
            "ambulance_type": "basic",
            "notes": "Test booking for API testing",
            "is_emergency": False
        }
        
        success, response = self.run_test(
            "Create Booking", 
            "POST", 
            "bookings", 
            200, 
            data=booking_data,
            token=self.patient_token,
            description="Create new ambulance booking"
        )
        
        if success and 'id' in response:
            self.test_booking_id = response['id']
            print(f"   Booking ID: {self.test_booking_id}")
        
        # Get patient bookings
        self.run_test(
            "Get Patient Bookings", 
            "GET", 
            "bookings", 
            200, 
            token=self.patient_token,
            description="Get all patient bookings"
        )
        
        # Get active booking
        self.run_test(
            "Get Active Booking", 
            "GET", 
            "bookings/active", 
            200, 
            token=self.patient_token,
            description="Get current active booking"
        )
        
        # Get specific booking
        if self.test_booking_id:
            self.run_test(
                "Get Specific Booking", 
                "GET", 
                f"bookings/{self.test_booking_id}", 
                200, 
                token=self.patient_token,
                description="Get booking by ID"
            )

    def test_driver_booking_actions(self):
        """Test driver booking actions"""
        print("\n=== DRIVER BOOKING ACTIONS ===")
        
        if not self.driver_token:
            print("❌ Skipping driver booking tests - no driver token")
            return
        
        # Get pending bookings
        self.run_test(
            "Get Pending Bookings", 
            "GET", 
            "bookings/pending", 
            200, 
            token=self.driver_token,
            description="Get all pending bookings for driver"
        )
        
        # Accept booking (if exists)
        if self.test_booking_id:
            success, response = self.run_test(
                "Accept Booking", 
                "PUT", 
                f"bookings/{self.test_booking_id}/accept", 
                200, 
                token=self.driver_token,
                description="Driver accepts the booking"
            )
            
            if success:
                # Update booking status
                self.run_test(
                    "Update to En Route", 
                    "PUT", 
                    f"bookings/{self.test_booking_id}/status?status=en_route", 
                    200, 
                    token=self.driver_token,
                    description="Update booking status to en_route"
                )
                
                self.run_test(
                    "Update to Arrived", 
                    "PUT", 
                    f"bookings/{self.test_booking_id}/status?status=arrived", 
                    200, 
                    token=self.driver_token,
                    description="Update booking status to arrived"
                )
                
                self.run_test(
                    "Update to In Progress", 
                    "PUT", 
                    f"bookings/{self.test_booking_id}/status?status=in_progress", 
                    200, 
                    token=self.driver_token,
                    description="Update booking status to in_progress"
                )
                
                self.run_test(
                    "Complete Booking", 
                    "PUT", 
                    f"bookings/{self.test_booking_id}/status?status=completed", 
                    200, 
                    token=self.driver_token,
                    description="Complete the booking"
                )

    def test_rating_system(self):
        """Test rating system"""
        print("\n=== RATING SYSTEM TESTS ===")
        
        if not self.patient_token or not self.test_booking_id:
            print("❌ Skipping rating tests - no patient token or booking ID")
            return
        
        # Rate completed booking
        rating_data = {
            "rating": 5,
            "review": "Excellent service! Very professional driver."
        }
        
        self.run_test(
            "Rate Booking", 
            "POST", 
            f"bookings/{self.test_booking_id}/rate", 
            200, 
            data=rating_data,
            token=self.patient_token,
            description="Rate completed booking"
        )

    def test_nearby_ambulances(self):
        """Test nearby ambulances API with ETA and distance"""
        print("\n=== NEARBY AMBULANCES TESTS ===")
        
        if not self.patient_token:
            print("❌ Skipping nearby ambulances tests - no patient token")
            return
        
        # Test nearby ambulances endpoint
        nearby_data = {
            "latitude": -1.2921,  # Nairobi coordinates
            "longitude": 36.8219,
            "radius_km": 50
        }
        
        success, response = self.run_test(
            "Get Nearby Ambulances", 
            "POST", 
            "driver/nearby", 
            200, 
            data=nearby_data,
            token=self.patient_token,
            description="Get nearby ambulances with ETA and distance"
        )
        
        if success:
            # Verify response structure
            if 'ambulances' in response:
                print(f"   Found {len(response['ambulances'])} nearby ambulances")
                
                # Check if any ambulances have required fields
                for amb in response['ambulances'][:3]:  # Check first 3
                    if 'distance_km' in amb and 'eta_minutes' in amb:
                        print(f"   ✅ Ambulance has distance_km: {amb['distance_km']}, eta_minutes: {amb['eta_minutes']}")
                    else:
                        print(f"   ❌ Ambulance missing distance_km or eta_minutes fields")
                        
            if 'eta_by_type' in response:
                print(f"   ETA by type data available: {list(response['eta_by_type'].keys())}")
                
                # Check KES pricing structure
                for amb_type, eta_info in response['eta_by_type'].items():
                    if 'count' in eta_info and 'min_eta_minutes' in eta_info:
                        print(f"   ✅ {amb_type}: {eta_info['count']} available, min ETA: {eta_info['min_eta_minutes']} min")
            
            print(f"   Total nearby ambulances: {response.get('total_nearby', 0)}")

    def test_pricing_structure(self):
        """Test KES pricing structure in bookings"""
        print("\n=== KES PRICING TESTS ===")
        
        if not self.patient_token:
            print("❌ Skipping pricing tests - no patient token")
            return
        
        # Create booking to check pricing
        booking_data = {
            "pickup_location": {
                "lat": -1.2921,
                "lng": 36.8219,
                "address": "Nairobi Test Location"
            },
            "ambulance_type": "basic",
            "notes": "Test booking for KES pricing verification",
            "is_emergency": False
        }
        
        success, response = self.run_test(
            "Create Booking for KES Pricing", 
            "POST", 
            "bookings", 
            200, 
            data=booking_data,
            token=self.patient_token,
            description="Create booking to verify KES pricing"
        )
        
        if success and 'estimated_fare' in response:
            fare = response['estimated_fare']
            print(f"   Basic ambulance estimated fare: KES {fare}")
            
            # Verify KES pricing ranges
            if fare >= 2000:  # Basic should be at least KES 2000
                print(f"   ✅ Basic fare {fare} meets minimum KES 2000")
            else:
                print(f"   ❌ Basic fare {fare} below expected KES 2000 minimum")
        
        # Test ICU pricing
        icu_booking_data = booking_data.copy()
        icu_booking_data["ambulance_type"] = "icu"
        
        success, response = self.run_test(
            "Create ICU Booking for Pricing", 
            "POST", 
            "bookings", 
            200, 
            data=icu_booking_data,
            token=self.patient_token,
            description="Create ICU booking to verify KES pricing"
        )
        
        if success and 'estimated_fare' in response:
            icu_fare = response['estimated_fare']
            print(f"   ICU ambulance estimated fare: KES {icu_fare}")
            
            if icu_fare >= 5000:  # ICU should be at least KES 5000
                print(f"   ✅ ICU fare {icu_fare} meets minimum KES 5000")
            else:
                print(f"   ❌ ICU fare {icu_fare} below expected KES 5000 minimum")
        
        # Test Neonatal pricing
        neonatal_booking_data = booking_data.copy()
        neonatal_booking_data["ambulance_type"] = "neonatal"
        
        success, response = self.run_test(
            "Create Neonatal Booking for Pricing", 
            "POST", 
            "bookings", 
            200, 
            data=neonatal_booking_data,
            token=self.patient_token,
            description="Create neonatal booking to verify KES pricing"
        )
        
        if success and 'estimated_fare' in response:
            neonatal_fare = response['estimated_fare']
            print(f"   Neonatal ambulance estimated fare: KES {neonatal_fare}")
            
            if neonatal_fare >= 8000:  # Neonatal should be at least KES 8000
                print(f"   ✅ Neonatal fare {neonatal_fare} meets minimum KES 8000")
            else:
                print(f"   ❌ Neonatal fare {neonatal_fare} below expected KES 8000 minimum")

    def test_sos_emergency(self):
        """Test SOS emergency booking"""
        print("\n=== SOS EMERGENCY TESTS ===")
        
        if not self.patient_token:
            print("❌ Skipping SOS tests - no patient token")
            return
        
        # Create SOS booking
        sos_data = {
            "latitude": -1.2921,  # Nairobi coordinates
            "longitude": 36.8219
        }
        
        success, response = self.run_test(
            "Create SOS Booking", 
            "POST", 
            "bookings/sos", 
            200, 
            data=sos_data,
            token=self.patient_token,
            description="Create emergency SOS booking"
        )
        
        if success and 'estimated_fare' in response:
            sos_fare = response['estimated_fare']
            print(f"   SOS emergency fare: KES {sos_fare}")
            
            # SOS should default to ICU pricing
            if sos_fare >= 5000:
                print(f"   ✅ SOS fare {sos_fare} uses ICU pricing (KES 5000+)")
            else:
                print(f"   ❌ SOS fare {sos_fare} below expected ICU pricing")

    def test_error_cases(self):
        """Test error handling"""
        print("\n=== ERROR HANDLING TESTS ===")
        
        # Test invalid login
        invalid_login = {
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        }
        
        self.run_test(
            "Invalid Login", 
            "POST", 
            "auth/login", 
            401, 
            data=invalid_login,
            description="Test invalid credentials"
        )
        
        # Test unauthorized access
        self.run_test(
            "Unauthorized Access", 
            "GET", 
            "auth/me", 
            401,
            description="Test access without token"
        )
        
        # Test duplicate registration
        if self.patient_user:
            duplicate_data = {
                "name": "Duplicate User",
                "email": self.patient_user["email"],
                "phone": "+1234567890",
                "password": "TestPass123!",
                "role": "patient"
            }
            
            self.run_test(
                "Duplicate Email Registration", 
                "POST", 
                "auth/register", 
                400, 
                data=duplicate_data,
                description="Test registration with existing email"
            )

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting SwiftCare API Tests...")
        print(f"Testing against: {self.base_url}")
        
        try:
            self.test_health_endpoints()
            self.test_patient_auth()
            self.test_driver_auth()
            self.test_driver_profile()
            self.test_nearby_ambulances()  # New test for nearby ambulances
            self.test_pricing_structure()  # New test for KES pricing
            self.test_booking_flow()
            self.test_driver_booking_actions()
            self.test_rating_system()
            self.test_sos_emergency()
            self.test_error_cases()
            
        except Exception as e:
            print(f"\n💥 Test suite crashed: {str(e)}")
            return False
        
        # Print results
        print(f"\n📊 TEST RESULTS")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for test in self.failed_tests:
                error_msg = test.get('error', f"Expected {test.get('expected')}, got {test.get('actual')}")
                print(f"  - {test['test']}: {error_msg}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = SwiftCareAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())