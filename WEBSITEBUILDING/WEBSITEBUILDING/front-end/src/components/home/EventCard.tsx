import { Link } from 'react-router-dom';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatTime12Hour } from '@/lib/utils';

export interface EventCardProps {
  id: string;
  title: string;
  date: string;
  // time: string;
  startTime: string;
  endTime: string;
  location: string;
  image: string;
  price?: string | { amount: number; currency: string };
  category: string;
  organizer: string;
}

const EventCard = ({
  id,
  title,
  date,
  // time,
  startTime,
  endTime,
  location,
  image,
  price = 'Free',
  category,
  organizer
}: EventCardProps) => {
  let displayPrice: string | null = null;
  if (typeof price === 'object' && price !== null) {
    displayPrice = `${price.amount.toLocaleString()} ${price.currency.toUpperCase()}`;
  } else if (price === 'Free') {
    displayPrice = 'Miễn phí';
  }

  return (
    <Link to={`/events/${id}`}>
      <div className="bg-white rounded-lg overflow-hidden shadow-sm event-card h-full">
        <div className="relative">
          <img
            src={image}
            alt={title}
            className="w-full h-48 object-cover"
          />
          <Badge
            className="absolute top-3 left-3 bg-white text-event-purple border-event-purple hover:bg-event-cyan transition-colors duration-200"
          >
            {category}
          </Badge>
          {displayPrice && (
            <div className="absolute bottom-3 right-3 bg-black bg-opacity-75 text-white px-3 py-1 rounded-full text-sm">
              {displayPrice}
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-lg line-clamp-2 mb-2">{title}</h3>

          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-event-teal" />
              <span>{date}</span>
            </div>

            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-event-orange" />
               <span>Từ {formatTime12Hour(startTime)} đến {formatTime12Hour(endTime)}</span>
            </div>

            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-event-pink" />
              <span className="truncate">{location}</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            Tổ chức bởi {organizer}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default EventCard;