/**
 * Comprehensive seed script — populates all collections with realistic demo data.
 * Run once on startup if collections are empty.
 */
import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Service } from '../models/Service';
import { Booking } from '../models/Booking';
import { Feedback } from '../models/Feedback';
import { Alert } from '../models/Alert';
import { FarmingCalendar } from '../models/FarmingCalendar';

// ─── Demo accounts (always upserted, never deleted) ─────────────────────────
// Login at /login with these credentials:
//   Farmer:           +91 80000 00001 / demo1234
//   Service Provider: +91 80000 00002 / demo1234
//   Admin:            +91 80000 00003 / demo1234
const DEMO_ACCOUNTS = [
  { phone: '+918000000001', name: 'Demo Farmer',    role: 'Farmer'           as const, password: 'demo1234' },
  { phone: '+918000000002', name: 'Demo Provider',  role: 'Service_Provider' as const, password: 'demo1234' },
  { phone: '+918000000003', name: 'Demo Admin',     role: 'Admin'            as const, password: 'demo1234' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rndFloat(min: number, max: number) { return parseFloat((Math.random() * (max - min) + min).toFixed(2)); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function daysAgo(n: number) { return new Date(Date.now() - n * 86400000); }
function daysFromNow(n: number) { return new Date(Date.now() + n * 86400000); }

// Karnataka/Maharashtra coordinates
function randomCoords(): [number, number] {
  const cities = [
    [77.5946, 12.9716], [74.8560, 15.8497], [76.6194, 15.3647],
    [75.7139, 15.1394], [77.3910, 13.3379], [76.1004, 10.5276],
    [73.8567, 18.5204], [75.3433, 19.8762], [77.0082, 11.0168],
    [80.2707, 13.0827], [78.4867, 17.3850], [72.8777, 19.0760],
  ];
  const base = pick(cities);
  return [base[0] + (Math.random() - 0.5) * 0.3, base[1] + (Math.random() - 0.5) * 0.3];
}

const FARMER_NAMES = [
  'Ramesh Kumar', 'Suresh Patil', 'Mahesh Reddy', 'Ganesh Naik', 'Rajesh Sharma',
  'Vijay Yadav', 'Anil Desai', 'Sunil Gowda', 'Prakash Hegde', 'Mohan Kulkarni',
  'Ravi Chandra', 'Sanjay Patel', 'Deepak Verma', 'Ashok Nair', 'Pradeep Joshi',
  'Santosh Rao', 'Dinesh Pillai', 'Harish Menon', 'Girish Bhat', 'Naresh Iyer',
];

const PROVIDER_NAMES = [
  'AgriTech Services', 'Green Farm Solutions', 'Kisan Help Center', 'Rural Tech Hub',
  'Farm Equipment Co', 'Soil Care Services', 'Water Solutions India', 'Harvest Pro',
  'Agro Labour Services', 'Transport Kisan', 'Fertilizer Direct', 'Crop Care India',
];

const LOCATIONS = [
  'Bangalore Rural, Karnataka', 'Dharwad, Karnataka', 'Belgaum, Karnataka',
  'Hubli, Karnataka', 'Tumkur, Karnataka', 'Hassan, Karnataka',
  'Pune, Maharashtra', 'Nashik, Maharashtra', 'Aurangabad, Maharashtra',
  'Coimbatore, Tamil Nadu', 'Hyderabad, Telangana', 'Warangal, Telangana',
];

const LANGUAGES = ['en', 'hi', 'kn', 'mr', 'te', 'ta', 'ml'] as const;

// ─── Service Templates ───────────────────────────────────────────────────────

const SERVICE_TEMPLATES = [
  // Transport (15)
  { type: 'Transport', desc: 'Tractor-trolley transport to mandi, capacity 3 tonnes', price: [800, 1500] },
  { type: 'Transport', desc: 'Mini truck for farm produce delivery within 30km radius', price: [1000, 2000] },
  { type: 'Transport', desc: 'Tempo transport for vegetables to wholesale market', price: [600, 1200] },
  { type: 'Transport', desc: 'Refrigerated van for perishable produce transport', price: [2000, 4000] },
  { type: 'Transport', desc: 'Bullock cart for short-distance farm transport', price: [200, 400] },
  // Irrigation (15)
  { type: 'Irrigation', desc: 'Drip irrigation installation for 1 acre, saves 60% water', price: [6000, 10000] },
  { type: 'Irrigation', desc: 'Sprinkler system setup for vegetables and field crops', price: [4000, 8000] },
  { type: 'Irrigation', desc: 'Borewell pump repair and maintenance service', price: [500, 2000] },
  { type: 'Irrigation', desc: 'Canal water distribution management for 5 acres', price: [1000, 2500] },
  { type: 'Irrigation', desc: 'Micro-irrigation system for horticulture crops', price: [8000, 15000] },
  // FertilizerSupply (15)
  { type: 'FertilizerSupply', desc: 'NPK 19:19:19 fertilizer supply with doorstep delivery', price: [1000, 1500] },
  { type: 'FertilizerSupply', desc: 'Organic vermicompost for soil health improvement', price: [600, 1000] },
  { type: 'FertilizerSupply', desc: 'Urea (46% N) supply for cereal crops', price: [300, 500] },
  { type: 'FertilizerSupply', desc: 'DAP fertilizer for root development and flowering', price: [1200, 1800] },
  { type: 'FertilizerSupply', desc: 'Micronutrient mix (Zinc, Boron, Iron) for deficiency correction', price: [400, 800] },
  // Labor (15)
  { type: 'Labor', desc: 'Experienced weeding team, 5 workers per day', price: [300, 600] },
  { type: 'Labor', desc: 'Harvesting labour for wheat and rice crops', price: [400, 700] },
  { type: 'Labor', desc: 'Transplanting team for paddy and vegetable seedlings', price: [350, 600] },
  { type: 'Labor', desc: 'Fruit picking team for mango and citrus orchards', price: [400, 800] },
  { type: 'Labor', desc: 'Land preparation and bed making labour', price: [300, 500] },
  // SoilTesting (15)
  { type: 'SoilTesting', desc: 'Complete soil health card — NPK, pH, organic carbon', price: [250, 500] },
  { type: 'SoilTesting', desc: 'Micronutrient analysis — Zinc, Iron, Manganese, Copper', price: [400, 700] },
  { type: 'SoilTesting', desc: 'Soil water retention and drainage capacity test', price: [300, 600] },
  { type: 'SoilTesting', desc: 'Heavy metal contamination test for safe farming', price: [500, 1000] },
  { type: 'SoilTesting', desc: 'Soil biological activity and microbial count analysis', price: [600, 1200] },
  // EquipmentRental (15)
  { type: 'EquipmentRental', desc: 'Tractor with rotavator for soil preparation, 1 acre/2hrs', price: [500, 1000] },
  { type: 'EquipmentRental', desc: 'Combine harvester for wheat/rice, 1 acre in 45 min', price: [2000, 3500] },
  { type: 'EquipmentRental', desc: 'Power sprayer 16L for pesticide application', price: [150, 300] },
  { type: 'EquipmentRental', desc: 'Drone spraying service, precision application 1 acre/10min', price: [300, 600] },
  { type: 'EquipmentRental', desc: 'Seed drill for uniform sowing, reduces seed waste by 20%', price: [400, 800] },
];

// ─── Alert Templates ─────────────────────────────────────────────────────────

const ALERT_TEMPLATES = [
  { type: 'weather', messages: [
    'Heavy rainfall expected in next 48 hours. Avoid pesticide spraying.',
    'Drought warning: No rain forecast for 3 weeks. Activate irrigation.',
    'Hailstorm alert for northern districts. Cover sensitive crops.',
    'High humidity (>85%) — risk of fungal diseases. Apply preventive fungicide.',
    'Cold wave approaching. Protect nursery seedlings with covers.',
    'Strong winds forecast. Stake tall crops to prevent lodging.',
    'Frost warning tonight. Irrigate fields to protect crops from cold damage.',
    'Heat wave alert: Temperature above 42°C. Increase irrigation frequency.',
    'Cyclone warning: Harvest mature crops immediately.',
    'Fog advisory: Delayed sunrise may affect photosynthesis this week.',
  ]},
  { type: 'marketPrice', messages: [
    'Tomato prices surge 40% at Bangalore APMC — good time to sell.',
    'Onion prices drop 25% — hold stock if possible.',
    'Wheat MSP increased to ₹2275/quintal for Rabi 2025-26.',
    'Cotton prices stable at ₹6800/quintal — moderate selling recommended.',
    'Rice procurement at MSP ₹2300/quintal starts next week.',
    'Potato prices rising in Delhi NCR — consider transport to northern markets.',
    'Sugarcane FRP fixed at ₹340/quintal for current season.',
    'Soybean prices at 3-year high — optimal selling window open.',
    'Maize demand up 30% from poultry industry — good market opportunity.',
    'Groundnut prices expected to rise post-festival season.',
  ]},
  { type: 'governmentScheme', messages: [
    'PM-KISAN 17th installment of ₹2000 to be credited this week.',
    'Soil Health Card scheme: Free soil testing camps in your district.',
    'PM Fasal Bima Yojana enrollment open until month end.',
    'Kisan Credit Card: Apply for crop loan at 4% interest rate.',
    'PM Krishi Sinchai Yojana: 55% subsidy on drip irrigation.',
    'eNAM registration open — sell directly to buyers across India.',
    'Agri-infrastructure fund: Low-interest loans for cold storage.',
    'FPO formation support: ₹15 lakh grant for farmer groups.',
    'Organic farming certification support scheme announced.',
    'Custom hiring center subsidy: 40% on farm machinery purchase.',
  ]},
  { type: 'emergency', messages: [
    'Fall armyworm outbreak reported in maize fields — immediate action needed.',
    'Locust swarm moving towards agricultural zones — alert authorities.',
    'Foot and mouth disease outbreak in livestock — restrict movement.',
    'Contaminated pesticide batch recalled — check product codes.',
    'Flash flood warning — move livestock and equipment to higher ground.',
  ]},
];

// ─── Farming Calendar Activities ─────────────────────────────────────────────

const CALENDAR_ACTIVITIES = [
  'Land preparation and ploughing',
  'Soil testing and amendment',
  'Seed treatment and sowing',
  'Transplanting seedlings',
  'First irrigation',
  'Basal fertilizer application',
  'Weeding and inter-cultivation',
  'Top dressing with nitrogen',
  'Pest scouting and monitoring',
  'Pesticide spray (preventive)',
  'Second irrigation',
  'Micronutrient foliar spray',
  'Earthing up',
  'Flowering stage irrigation',
  'Fungicide application',
  'Grain filling irrigation',
  'Maturity assessment',
  'Pre-harvest drying',
  'Harvesting',
  'Post-harvest storage treatment',
];

const CROPS = ['Wheat', 'Rice', 'Tomato', 'Onion', 'Cotton', 'Sugarcane', 'Maize', 'Potato', 'Groundnut', 'Soybean'];

// ─── Main Seed Function ───────────────────────────────────────────────────────

export async function seedAllData(): Promise<void> {
  try {
    // ── Always upsert the 3 demo accounts first ───────────────────────────
    for (const demo of DEMO_ACCOUNTS) {
      const passwordHash = await bcrypt.hash(demo.password, 10);
      await User.findOneAndUpdate(
        { phone: demo.phone },
        {
          name: demo.name,
          phone: demo.phone,
          role: demo.role,
          passwordHash,
          isVerified: true,
          isActive: true,
          location: 'Bangalore',
          languagePreference: 'en',
          trust_score: 90,
          alertPreferences: ['weather', 'marketPrice'],
        },
        { upsert: true, new: true }
      );
    }
    console.log('[Seed] ✅ Demo accounts upserted (phone: +918000000001/02/03, password: demo1234)');

    const userCount = await User.countDocuments();
    if (userCount > 5) {
      const serviceCount = await Service.countDocuments();
      if (serviceCount > 10) {
        console.log('[Seed] Data already exists, skipping bulk seed.');
        return;
      }
    }

    console.log('[Seed] Clearing existing data and re-seeding...');

    // Clear non-demo users and all other collections
    await Promise.all([
      User.deleteMany({ role: { $in: ['Farmer', 'Service_Provider'] }, phone: { $nin: DEMO_ACCOUNTS.map(d => d.phone) } }),
      Service.deleteMany({}),
      Booking.deleteMany({}),
      Feedback.deleteMany({}),
      Alert.deleteMany({}),
      FarmingCalendar.deleteMany({}),
    ]);

    console.log('[Seed] Starting comprehensive data seed...');

    // ── 1. Create 20 Farmers ──────────────────────────────────────────────
    const farmerDocs = FARMER_NAMES.map((name, i) => ({
      name,
      phone: `+9190000${String(i + 1).padStart(5, '0')}`,
      role: 'Farmer' as const,
      location: pick(LOCATIONS),
      languagePreference: pick(LANGUAGES),
      trust_score: rnd(60, 95),
      isActive: true,
      isVerified: true,
      alertPreferences: ['weather', 'marketPrice'],
    }));
    const farmers = await User.insertMany(farmerDocs);
    console.log(`[Seed] Created ${farmers.length} farmers`);

    // ── 2. Create 12 Service Providers ───────────────────────────────────
    const providerDocs = PROVIDER_NAMES.map((name, i) => ({
      name,
      phone: `+9191000${String(i + 1).padStart(5, '0')}`,
      role: 'Service_Provider' as const,
      location: pick(LOCATIONS),
      languagePreference: pick(LANGUAGES),
      trust_score: rnd(70, 98),
      isActive: true,
      isVerified: true,
      alertPreferences: ['weather'],
    }));
    const providers = await User.insertMany(providerDocs);
    console.log(`[Seed] Created ${providers.length} providers`);

    // ── 3. Create 1 Admin ─────────────────────────────────────────────────
    await User.findOneAndUpdate(
      { phone: '+919999999999' },
      { name: 'Platform Admin', phone: '+919999999999', role: 'Admin', location: 'Bangalore', languagePreference: 'en', trust_score: 100, isActive: true, isVerified: true },
      { upsert: true }
    );

    // ── 4. Create 100+ Services (5 per template × 6 categories = 150) ────
    const serviceDocs: any[] = [];
    for (const template of SERVICE_TEMPLATES) {
      for (let i = 0; i < 5; i++) {
        const provider = pick(providers);
        const coords = randomCoords();
        serviceDocs.push({
          provider_id: provider._id,
          type: template.type,
          category: template.type,
          description: template.desc,
          price: rnd(template.price[0], template.price[1]),
          availability: Math.random() > 0.1,
          averageRating: rndFloat(3.2, 5.0),
          ratingCount: rnd(5, 120),
          status: 'active',
          priceTrend: pick(['rising', 'stable', 'falling']),
          optimalBookingWindow: pick(['Next 7 days', 'Next 2 weeks', 'This month', 'Flexible']),
          location: { type: 'Point', coordinates: coords },
        });
      }
    }
    const services = await Service.insertMany(serviceDocs);
    console.log(`[Seed] Created ${services.length} services`);

    // ── 5. Create 100 Bookings ────────────────────────────────────────────
    const statuses = ['Pending', 'Accepted', 'InProgress', 'Completed', 'Cancelled'] as const;
    const bookingDocs: any[] = [];
    for (let i = 0; i < 100; i++) {
      const farmer = pick(farmers);
      const service = pick(services) as any;
      const status = pick(statuses);
      bookingDocs.push({
        farmer_id: farmer._id,
        service_id: service._id,
        provider_id: service.provider_id,
        status,
        date: i < 50 ? daysAgo(rnd(1, 60)) : daysFromNow(rnd(1, 30)),
        timeSlot: pick(['08:00-10:00', '10:00-12:00', '14:00-16:00', '16:00-18:00']),
        feedbackPromptSent: status === 'Completed',
        ...(status === 'Cancelled' ? { cancelledBy: pick(['farmer', 'provider']), cancellationReason: 'Schedule conflict' } : {}),
      });
    }
    const bookings = await Booking.insertMany(bookingDocs);
    console.log(`[Seed] Created ${bookings.length} bookings`);

    // ── 6. Create 100 Feedback entries (for Completed bookings) ──────────
    const completedBookings = bookings.filter((b: any) => b.status === 'Completed');
    const feedbackDocs: any[] = [];
    const usedPairs = new Set<string>();

    for (const booking of completedBookings) {
      const b = booking as any;
      const pairKey = `${b._id}-${b.farmer_id}`;
      if (usedPairs.has(pairKey)) continue;
      usedPairs.add(pairKey);

      const rating = rnd(3, 5);
      const comments = [
        'Excellent service, very professional!',
        'Good work, completed on time.',
        'Satisfied with the service quality.',
        'Provider was punctual and skilled.',
        'Average service, could be better.',
        'Very helpful and knowledgeable.',
        'Great experience, will book again.',
        'Service was as described.',
        'Reasonable price for good quality.',
        'Highly recommended to other farmers.',
      ];
      feedbackDocs.push({
        booking_id: b._id,
        reviewer_id: b.farmer_id,
        reviewee_id: b.provider_id,
        rating,
        comment: pick(comments),
        is_flagged: Math.random() < 0.05,
      });
    }

    // Fill up to 100 feedback entries
    while (feedbackDocs.length < 100 && completedBookings.length > 0) {
      const booking = pick(completedBookings) as any;
      const pairKey = `${booking._id}-${booking.provider_id}`;
      if (usedPairs.has(pairKey)) continue;
      usedPairs.add(pairKey);
      feedbackDocs.push({
        booking_id: booking._id,
        reviewer_id: booking.provider_id,
        reviewee_id: booking.farmer_id,
        rating: rnd(3, 5),
        comment: 'Farmer was cooperative and payment was prompt.',
        is_flagged: false,
      });
    }

    if (feedbackDocs.length > 0) {
      await Feedback.insertMany(feedbackDocs);
      console.log(`[Seed] Created ${feedbackDocs.length} feedback entries`);
    }

    // ── 7. Create 100 Alerts ──────────────────────────────────────────────
    const alertDocs: any[] = [];
    for (const template of ALERT_TEMPLATES) {
      for (const message of template.messages) {
        for (let i = 0; i < 2; i++) {
          const coords = randomCoords();
          alertDocs.push({
            type: template.type,
            message,
            targetLocation: pick(LOCATIONS),
            coordinates: { type: 'Point', coordinates: coords },
            isActive: Math.random() > 0.3,
            expiresAt: daysFromNow(rnd(1, 14)),
          });
        }
      }
    }
    await Alert.insertMany(alertDocs.slice(0, 100));
    console.log(`[Seed] Created ${Math.min(alertDocs.length, 100)} alerts`);

    // ── 8. Create Farming Calendars for all farmers ───────────────────────
    const calendarDocs = farmers.map((farmer: any) => {
      const crop = pick(CROPS);
      const schedule = CALENDAR_ACTIVITIES.map((activity, idx) => ({
        activity,
        date: daysFromNow(idx * 7 - rnd(0, 3)),
        notes: `${crop} — ${activity.toLowerCase()}. Check weather before proceeding.`,
      }));
      return {
        farmer_id: farmer._id,
        cropType: crop,
        location: farmer.location,
        scheduleJson: schedule,
        lastUpdated: new Date(),
      };
    });
    await FarmingCalendar.insertMany(calendarDocs);
    console.log(`[Seed] Created ${calendarDocs.length} farming calendars`);

    console.log('[Seed] ✅ All data seeded successfully!');
    console.log('[Seed] Summary:');
    console.log(`  - ${farmers.length} Farmers`);
    console.log(`  - ${providers.length} Service Providers`);
    console.log(`  - ${services.length} Services`);
    console.log(`  - ${bookings.length} Bookings`);
    console.log(`  - ${feedbackDocs.length} Feedback entries`);
    console.log(`  - ${Math.min(alertDocs.length, 100)} Alerts`);
    console.log(`  - ${calendarDocs.length} Farming Calendars`);

  } catch (err) {
    console.error('[Seed] Error during seeding:', err);
  }
}
