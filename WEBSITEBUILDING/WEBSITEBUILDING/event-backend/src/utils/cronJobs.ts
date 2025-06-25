import cron from 'node-cron';
import Event from '../models/Event';
import Ticket from '../models/Ticket';
import { isPast } from 'date-fns';

const startCronJobs = () => {

  cron.schedule('0 0 * * *', async () => { 
    console.log('Running daily ticket status update cron job...');
    const now = new Date();

    try {

      const endedEvents = await Event.find({
        date: { $lt: now }, 
        status: 'active' 
      });

      if (endedEvents.length === 0) {
        console.log('No ended events found to process.');
        return;
      }

      const endedEventIds = endedEvents.map(event => event._id);

      console.log(`Found ${endedEventIds.length} ended events. Processing tickets...`);

      const result = await Ticket.updateMany(
        {
          eventId: { $in: endedEventIds },
          checkInStatus: 'pending',
        },
        {
          $set: { checkInStatus: 'noShow' } 
        }
      );

      console.log(`Updated ${result.modifiedCount} tickets to 'noShow' status.`);

      await Event.updateMany(
        { _id: { $in: endedEventIds }, status: 'active' },
        { $set: { status: 'completed' } }
      );
      console.log(`Updated ${endedEventIds.length} events to 'completed' status.`);


    } catch (error) {
      console.error('Error in ticket status update cron job:', error);
    }
  });
};

export default startCronJobs;