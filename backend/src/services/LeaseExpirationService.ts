import Lease from '../models/Lease';
import Unit from '../models/Unit';

class LeaseExpirationService {
  /**
   * Check for expired leases and update their status.
   * Also updates the corresponding unit occupancy.
   */
  async checkAndExpireLeases(): Promise<{ expiredCount: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find active leases that have passed their end date
    const expiredLeases = await Lease.find({
      status: 'active',
      endDate: { $lt: today },
    });

    let expiredCount = 0;

    for (const lease of expiredLeases) {
      try {
        // Update lease status
        lease.status = 'expired';
        await lease.save();

        // Update unit - mark as unoccupied and clear tenant reference
        await Unit.findByIdAndUpdate(lease.unit, {
          isOccupied: false,
          tenant: null,
        });

        expiredCount++;
        console.log(
          `[LeaseExpiration] Expired lease ${lease._id} for unit ${lease.unit}`
        );
      } catch (error) {
        console.error(
          `[LeaseExpiration] Error expiring lease ${lease._id}:`,
          error
        );
      }
    }

    if (expiredCount > 0) {
      console.log(`[LeaseExpiration] Successfully expired ${expiredCount} lease(s)`);
    }

    return { expiredCount };
  }
}

export default new LeaseExpirationService();
