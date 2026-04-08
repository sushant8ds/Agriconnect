# Requirements Document

## Introduction

This document specifies requirements for six enhancements to the AgriConnect platform. These enhancements address critical usability issues, improve real-time communication, fix existing bugs, and expand knowledge management capabilities for farmers and administrators.

## Glossary

- **Booking_System**: The subsystem responsible for managing service booking requests, validations, and state transitions
- **Notification_Service**: The subsystem that sends real-time push notifications to users via Firebase Cloud Messaging
- **Admin_Panel**: The administrative interface for managing services, users, and knowledge base content
- **Service_Provider**: A user who offers agricultural services (transport, irrigation, equipment rental, etc.)
- **Farmer**: A user who books agricultural services
- **Knowledge_Base**: A collection of question-answer pairs used by the AI chatbot and crop doctor features
- **Crop_Doctor**: A diagnostic tool that identifies crop diseases and provides treatment recommendations
- **Krishi_Center**: A government agricultural extension center that provides expert consultation to farmers
- **Service_Approval**: The administrative process of reviewing and activating service listings submitted by providers

## Requirements

### Requirement 1: Mandatory Date Selection for Booking

**User Story:** As a farmer, I want the booking form to require date selection before submission, so that I cannot accidentally create bookings without specifying when I need the service.

#### Acceptance Criteria

1. WHEN a farmer attempts to submit a booking form without selecting a date, THE Booking_System SHALL display a validation error message
2. WHEN a farmer attempts to submit a booking form without selecting a date, THE Booking_System SHALL prevent the booking request from being sent to the backend
3. THE Booking_System SHALL display the date input field with a visual indicator showing it is required
4. WHEN a farmer selects a valid date, THE Booking_System SHALL enable the submit button
5. THE Booking_System SHALL validate that the selected date is not in the past

### Requirement 2: Real-time Provider Notifications

**User Story:** As a service provider, I want to receive immediate notifications when a farmer books my service, so that I can respond quickly and provide better customer service.

#### Acceptance Criteria

1. WHEN a farmer creates a booking, THE Notification_Service SHALL send a push notification to the service provider within 5 seconds
2. THE Notification_Service SHALL include the service type in the notification message
3. THE Notification_Service SHALL include the booking date in the notification message
4. THE Notification_Service SHALL include the booking time slot in the notification message
5. THE Notification_Service SHALL include the farmer name in the notification message
6. THE Notification_Service SHALL include the farmer phone number in the notification message
7. WHEN the service provider is offline, THE Notification_Service SHALL queue the notification for delivery when the provider reconnects

### Requirement 3: Fix Admin Service Approval

**User Story:** As an administrator, I want to successfully approve or reject service listings, so that I can control which services are visible to farmers.

#### Acceptance Criteria

1. WHEN an administrator clicks approve on a pending service, THE Admin_Panel SHALL update the service status to active
2. WHEN an administrator clicks reject on a pending service, THE Admin_Panel SHALL update the service status to rejected
3. WHEN a service status update succeeds, THE Admin_Panel SHALL display a success confirmation message
4. WHEN a service status update fails, THE Admin_Panel SHALL display the specific error message returned from the backend
5. WHEN a service is approved, THE Admin_Panel SHALL refresh the service list to reflect the updated status
6. THE Admin_Panel SHALL send the service ID and new status to the correct API endpoint

### Requirement 4: Farmer Booking Cancellation

**User Story:** As a farmer, I want to cancel my bookings when my plans change, so that I can manage my service requests effectively.

#### Acceptance Criteria

1. WHEN a farmer clicks cancel on a booking with status Pending, THE Booking_System SHALL update the booking status to Cancelled
2. WHEN a farmer clicks cancel on a booking with status Accepted, THE Booking_System SHALL update the booking status to Cancelled
3. WHEN a farmer cancels a booking, THE Booking_System SHALL record the cancellation reason if provided
4. WHEN a farmer cancels a booking, THE Notification_Service SHALL notify the service provider within 5 seconds
5. WHEN a booking is cancelled, THE Booking_System SHALL display a success confirmation to the farmer
6. THE Booking_System SHALL prevent cancellation of bookings with status InProgress
7. THE Booking_System SHALL prevent cancellation of bookings with status Completed
8. THE Booking_System SHALL prevent cancellation of bookings with status Cancelled

### Requirement 5: Admin Knowledge Base Management

**User Story:** As an administrator, I want to add new questions and answers to the knowledge bases, so that farmers can get accurate information without requiring code deployments.

#### Acceptance Criteria

1. THE Admin_Panel SHALL provide a form to add new chatbot knowledge entries
2. THE Admin_Panel SHALL provide a form to add new crop doctor knowledge entries
3. WHEN an administrator submits a new chatbot entry, THE Knowledge_Base SHALL store the keywords and answer
4. WHEN an administrator submits a new crop doctor entry, THE Knowledge_Base SHALL store the disease name, symptoms, treatment, and prevention information
5. WHEN a new knowledge entry is added, THE Knowledge_Base SHALL make it immediately available to farmers without server restart
6. THE Admin_Panel SHALL validate that required fields are not empty before submission
7. THE Admin_Panel SHALL display a success message when a knowledge entry is added successfully
8. THE Admin_Panel SHALL display existing knowledge entries in a searchable list
9. THE Admin_Panel SHALL allow administrators to edit existing knowledge entries
10. THE Admin_Panel SHALL allow administrators to delete knowledge entries

### Requirement 6: Enhanced Crop Doctor with Direct Contact

**User Story:** As a farmer, I want to see nearby Krishi center contact information and send photos of my crop problem, so that I can get expert verification and immediate help.

#### Acceptance Criteria

1. WHEN a farmer searches for a crop problem, THE Crop_Doctor SHALL display the identified disease name and symptoms
2. WHEN a farmer searches for a crop problem, THE Crop_Doctor SHALL display treatment recommendations
3. WHEN a farmer searches for a crop problem, THE Crop_Doctor SHALL display prevention measures
4. WHEN a farmer views crop doctor results, THE Crop_Doctor SHALL display phone numbers of the three nearest Krishi centers based on farmer location
5. WHEN a farmer views crop doctor results, THE Crop_Doctor SHALL display the distance to each Krishi center
6. WHEN a farmer clicks a Krishi center phone number, THE Crop_Doctor SHALL initiate a phone call to that number
7. THE Crop_Doctor SHALL provide a camera button to capture photos of the affected crop
8. WHEN a farmer captures a photo, THE Crop_Doctor SHALL allow the farmer to attach the photo to a consultation request
9. WHEN a farmer sends a consultation request with photo, THE Crop_Doctor SHALL transmit the photo and problem description to the selected Krishi center
10. THE Crop_Doctor SHALL validate that the farmer has granted camera permissions before accessing the camera
11. THE Crop_Doctor SHALL validate that the farmer has granted location permissions before showing nearby Krishi centers
12. WHEN location services are disabled, THE Crop_Doctor SHALL display a message prompting the farmer to enable location services

