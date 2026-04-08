import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Service } from '../models/Service';

/**
 * Seeds a demo provider + demo farmer + demo services so the platform works out of the box.
 * Only runs in non-production environments (called from index.ts bootstrap).
 * Safe to run multiple times — uses upsert logic.
 */
export async function seedAllData(): Promise<void> {
  try {
    // --- Demo Provider ---
    const providerPhone = '+919000000001';
    let provider = await User.findOne({ phone: providerPhone });
    if (!provider) {
      provider = await User.create({
        name: 'Demo Provider',
        phone: providerPhone,
        passwordHash: await bcrypt.hash('provider123', 10),
        role: 'Service_Provider',
        location: 'Karnataka',
        isVerified: true,
        trust_score: 8,
      });
      console.log('[Seed] Created demo provider:', provider._id);
    }

    // --- Demo Farmer ---
    const farmerPhone = '+919000000002';
    const farmerExists = await User.findOne({ phone: farmerPhone });
    if (!farmerExists) {
      await User.create({
        name: 'Demo Farmer',
        phone: farmerPhone,
        passwordHash: await bcrypt.hash('farmer123', 10),
        role: 'Farmer',
        location: 'Karnataka',
        isVerified: true,
        trust_score: 5,
      });
      console.log('[Seed] Created demo farmer');
    }

    // --- Demo Services (linked to demo provider) ---
    const existingServices = await Service.countDocuments({ provider_id: provider._id });
    if (existingServices === 0) {
      const services = [
        { type: 'Transport', price: 1200, description: 'Tractor transport for 1 acre, includes loading', availability: true },
        { type: 'Irrigation', price: 800, description: 'Drip irrigation setup and operation for 1 acre', availability: true },
        { type: 'Labor', price: 500, description: 'Farm labour for harvesting, 4 workers per day', availability: true },
        { type: 'SoilTesting', price: 350, description: 'Complete soil nutrient analysis with report', availability: true },
        { type: 'FertilizerSupply', price: 1500, description: 'NPK fertilizer supply for 2 acres', availability: true },
        { type: 'EquipmentRental', price: 2000, description: 'Combine harvester rental per day', availability: true },
      ];

      for (const s of services) {
        await Service.create({
          provider_id: provider._id,
          type: s.type,
          category: s.type,
          price: s.price,
          description: s.description,
          availability: s.availability,
          status: 'active',
          priceTrend: 'stable',
          location: { type: 'Point', coordinates: [77.5946, 12.9716] },
        });
      }
      console.log('[Seed] Created 6 demo services for provider', provider._id);
    }

    console.log('[Seed] Done. Demo credentials:');
    console.log('  Provider → phone: +919000000001, password: provider123, role: Service_Provider');
    console.log('  Farmer   → phone: +919000000002, password: farmer123,   role: Farmer');
  } catch (err) {
    console.error('[Seed] Error during seeding:', err);
  }
}
