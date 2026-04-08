# Implementation Plan: AgriConnect Platform Enhancements

## Overview

This implementation plan covers six critical enhancements to the AgriConnect platform:
1. Mandatory date selection validation for bookings
2. Real-time provider notifications with enhanced payload
3. Fix admin service approval API calls
4. Farmer booking cancellation functionality
5. Admin knowledge base management (CRUD operations)
6. Enhanced crop doctor with Krishi center lookup and photo upload

The implementation follows an incremental approach, building each feature with proper validation, error handling, and user feedback.

## Tasks

- [x] 1. Set up new data models and database indexes
  - [x] 1.1 Create KnowledgeBase model with schema and indexes
    - Create `backend/src/models/KnowledgeBase.ts` with type-safe schema
    - Add indexes for type, keywords, and disease fields
    - Support both chatbot and crop-doctor entry types
    - _Requirements: 5.3, 5.4_
  
  - [x] 1.2 Create KrishiCenter model with geospatial indexing
    - Create `backend/src/models/KrishiCenter.ts` with location schema
    - Add 2dsphere index for geospatial queries
    - Include fields: name, phone, address, district, state, location, services
    - _Requirements: 6.4, 6.5_
  
  - [x] 1.3 Create Consultation model for farmer-center communication
    - Create `backend/src/models/Consultation.ts` with status tracking
    - Link to farmer_id and krishi_center_id via ObjectId references
    - Support photo storage (base64 or URL)
    - _Requirements: 6.8, 6.9_

- [x] 2. Implement knowledge base management backend
  - [x] 2.1 Create knowledgeBaseController with CRUD endpoints
    - Create `backend/src/controllers/knowledgeBaseController.ts`
    - Implement createKBEntry (POST /admin/knowledge)
    - Implement getKBEntries (GET /admin/knowledge)
    - Implement updateKBEntry (PATCH /admin/knowledge/:id)
    - Implement deleteKBEntry (DELETE /admin/knowledge/:id)
    - Add validation for required fields based on entry type
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.9, 5.10_
  
  - [x] 2.2 Create Krishi center lookup endpoint
    - Implement getNearbyKrishiCenters (GET /krishi-centers/nearby)
    - Use MongoDB $geoNear aggregation for distance calculation
    - Support lat, lng, and limit query parameters
    - Return centers within 50km radius sorted by distance
    - _Requirements: 6.4, 6.5_
  
  - [x] 2.3 Create knowledge base routes with authentication
    - Create `backend/src/routes/knowledge.ts`
    - Apply authenticate and adminOnly middleware to admin endpoints
    - Apply authenticate middleware to public Krishi center lookup
    - Register routes in main Express app
    - _Requirements: 5.1, 5.2_

- [ ] 3. Enhance booking controller for notifications and cancellations
  - [-] 3.1 Enhance createBooking notification payload
    - Modify `backend/src/controllers/bookingController.ts` createBooking function
    - Populate service and farmer details before sending notification
    - Include service type, date, time slot, farmer name, and farmer phone in notification
    - Ensure notification is sent within 5 seconds of booking creation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [ ] 3.2 Add cancellation reason field to updateBookingStatus
    - Modify updateBookingStatus to accept cancellationReason in request body
    - Save cancellationReason to booking document when status is Cancelled
    - Send notification to provider when farmer cancels booking
    - Validate that only Pending or Accepted bookings can be cancelled
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 4. Enhance crop doctor with photo upload and consultation
  - [x] 4.1 Add photo upload support to analyzeImage endpoint
    - Modify `backend/src/controllers/cropDoctorController.ts`
    - Configure multer middleware to accept image uploads
    - Pass image to OpenAI GPT-4 Vision API when provided
    - Return diagnosis with disease name, symptoms, treatment, and prevention
    - _Requirements: 6.1, 6.2, 6.3, 6.7_
  
  - [x] 4.2 Create consultation request endpoint
    - Implement sendConsultation (POST /crop-doctor/consultation)
    - Accept krishiCenterId, description, and optional photo
    - Validate Krishi center exists before creating consultation
    - Store consultation record with pending status
    - _Requirements: 6.8, 6.9_
  
  - [x] 4.3 Update crop doctor routes
    - Modify `backend/src/routes/cropDoctor.ts`
    - Add uploadMiddleware to analyze and consultation endpoints
    - Register new consultation endpoint
    - _Requirements: 6.7, 6.8_

- [ ] 5. Checkpoint - Backend API testing
  - Ensure all new endpoints return correct responses
  - Test knowledge base CRUD operations with Postman or similar tool
  - Test Krishi center geospatial queries with sample coordinates
  - Test booking notifications include all required fields
  - Test farmer cancellation updates booking status correctly
  - Ask the user if questions arise

- [x] 6. Implement mandatory date validation in booking form
  - [x] 6.1 Add date validation to ServicesPage
    - Modify `web/src/pages/ServicesPage.tsx`
    - Add dateError state to track validation errors
    - Create validateBookingDate function to check date is selected and not in past
    - Call validation before submitting booking request
    - Display red border and error message when validation fails
    - Disable submit button when date is empty
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [-] 7. Implement farmer booking cancellation UI
  - [ ] 7.1 Add cancellation functionality to BookingsPage
    - Modify `web/src/pages/BookingsPage.tsx`
    - Add cancelModal state to control modal visibility
    - Add cancelReason state for optional cancellation reason
    - Add cancel button to booking cards (only for Pending/Accepted status)
    - Create cancelBooking function to call PATCH /bookings/:id
    - Display cancellation confirmation modal with reason textarea
    - Refresh bookings list after successful cancellation
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.7, 4.8_

- [ ] 8. Fix admin service approval API calls
  - [ ] 8.1 Correct service approval endpoints in AdminPanelPage
    - Modify `web/src/pages/AdminPanelPage.tsx`
    - Fix approveService to use PATCH /admin/services/:id with { status: 'active' }
    - Fix rejectService to use PATCH /admin/services/:id with { status: 'rejected' }
    - Display success message on successful status update
    - Display specific error message from backend on failure
    - Refresh service list to show updated status
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 9. Implement admin knowledge base management UI
  - [ ] 9.1 Add knowledge base management tab to AdminPanelPage
    - Add new 'knowledge' tab to AdminPanelPage
    - Create KB entry form with type selector (chatbot | crop-doctor)
    - For chatbot: add keywords (comma-separated) and answer fields
    - For crop-doctor: add disease, symptoms, treatment, prevention, crops, severity fields
    - Validate required fields before submission
    - _Requirements: 5.1, 5.2, 5.6, 5.7_
  
  - [ ] 9.2 Implement KB entry list and CRUD operations
    - Display existing KB entries in searchable list
    - Implement addKBEntry function (POST /admin/knowledge)
    - Implement updateKBEntry function (PATCH /admin/knowledge/:id)
    - Implement deleteKBEntry function (DELETE /admin/knowledge/:id)
    - Add edit and delete buttons to each entry
    - Display success message after successful operations
    - _Requirements: 5.3, 5.4, 5.5, 5.8, 5.9, 5.10_

- [x] 10. Enhance crop doctor with photo upload and Krishi centers
  - [x] 10.1 Add camera capture and photo preview
    - Modify `web/src/pages/CropDoctorPage.tsx`
    - Add photo state to store captured/selected image file
    - Add camera button using HTML5 file input with capture="environment"
    - Display photo preview after capture
    - _Requirements: 6.7, 6.10_
  
  - [x] 10.2 Add location permission and Krishi center lookup
    - Add location state to store GPS coordinates
    - Request geolocation permission on component mount
    - Add krishiCenters state to store nearby centers
    - Fetch nearby centers after diagnosis (GET /krishi-centers/nearby)
    - Display message prompting location enable if permission denied
    - _Requirements: 6.4, 6.5, 6.11, 6.12_
  
  - [x] 10.3 Display Krishi centers with call functionality
    - Create Krishi center display section in result view
    - Show center name, distance, and phone number for each center
    - Add clickable phone link (tel:) to initiate calls
    - Limit display to 3 nearest centers
    - _Requirements: 6.4, 6.5, 6.6_
  
  - [x] 10.4 Implement consultation request with photo
    - Modify analyze function to send photo via FormData if available
    - Add consultation request button in result view
    - Send POST /crop-doctor/consultation with photo and description
    - Display success confirmation after sending consultation
    - _Requirements: 6.8, 6.9_

- [x] 11. Seed Krishi center data for testing
  - [x] 11.1 Create seed script for Krishi centers
    - Create `backend/src/scripts/seedKrishiCenters.ts`
    - Add sample Krishi centers with realistic coordinates for major agricultural districts
    - Include centers from multiple states (Punjab, Haryana, UP, Maharashtra, Karnataka, Tamil Nadu)
    - Ensure geospatial indexes are created before seeding
    - _Requirements: 6.4, 6.5_

- [ ] 12. Update translation files for new UI elements
  - [ ] 12.1 Add English translations for new features
    - Update `web/src/i18n/locales/en.json`
    - Add keys for: date validation errors, cancellation modal, KB management, Krishi centers
    - _Requirements: 1.1, 4.5, 5.7, 6.4_
  
  - [ ] 12.2 Add Hindi translations for new features
    - Update `web/src/i18n/locales/hi.json`
    - Add Hindi translations for all new UI strings
    - _Requirements: 1.1, 4.5, 5.7, 6.4_
  
  - [ ] 12.3 Add regional language translations
    - Update Telugu, Kannada, Tamil, Malayalam, Marathi locale files
    - Add translations for new UI elements in all supported languages
    - _Requirements: 1.1, 4.5, 5.7, 6.4_

- [ ] 13. Final checkpoint - Integration testing
  - Test complete booking flow with mandatory date validation
  - Verify provider receives enhanced notifications with all details
  - Test admin service approval/rejection workflow
  - Test farmer booking cancellation for different statuses
  - Test admin KB management CRUD operations
  - Test crop doctor photo upload and Krishi center lookup
  - Test consultation request submission
  - Ensure all tests pass, ask the user if questions arise

## Notes

- All tasks build incrementally on existing codebase
- Each task references specific requirements for traceability
- Backend tasks (1-5) should be completed before frontend tasks (6-12)
- Translation updates (12) can be done in parallel with other frontend tasks
- Checkpoints ensure validation at critical integration points
- No property-based tests included as this is primarily UI/API enhancement work
