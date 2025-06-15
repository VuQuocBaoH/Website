import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Clock, MapPin, Tag, Users, Plus, Minus, X } from "lucide-react"; // Import Plus, Minus, X icons
import { toast } from "sonner";
import axios from 'axios';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import Navbar from "@/components/layout/Navbar";

const API_BASE_URL = 'http://localhost:5000/api';

// Định nghĩa schema cho một mục lịch trình (Frontend)
const scheduleItemSchema = z.object({
  time: z.string().min(1, "Thời gian là bắt buộc"),
  title: z.string().min(1, "Tiêu đề là bắt buộc"),
  description: z.string().optional(),
});

const eventSchema = z.object({
  title: z.string().min(5, "Event title must be at least 5 characters"),
  date: z.date({
    required_error: "Event date is required",
  }),
  time: z.string().min(1, "Event time is required"),
  location: z.string().min(5, "Location must be at least 5 characters"),
  category: z.string().min(1, "Please select a category"),
  price: z.string().optional(),
  capacity: z.string().optional(),
  description: z.string().min(20, "Description must be at least 20 characters"),
  image: z.string().optional(),
  // Thêm schedule vào eventSchema
  schedule: z.array(scheduleItemSchema).optional(), // Lịch trình là một mảng các mục
});

const EditEvent = () => {
  const { id } = useParams<{ id: string }>(); // Lấy ID sự kiện từ URL
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');

    if (!token || !userString || !id) {
      toast.error("Authentication or event ID missing. Please log in.");
      navigate('/signin', { replace: true });
      return;
    }

    try {
      const user = JSON.parse(userString);
      setCurrentUsername(user.username);
    } catch (e) {
      console.error("Failed to parse user data from localStorage", e);
      toast.error("User data corrupted. Please log in again.");
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/signin', { replace: true });
      return;
    }

    const fetchEvent = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/events/${id}`);
        const eventData = response.data;

        form.reset({
          title: eventData.title,
          date: new Date(eventData.date),
          time: eventData.time,
          location: eventData.location,
          category: eventData.category,
          price: eventData.price,
          capacity: eventData.capacity ? eventData.capacity.toString() : "",
          description: eventData.description,
          image: eventData.image,
          schedule: eventData.schedule || [], // Điền dữ liệu schedule vào form
        });

        setIsLoadingPage(false);
      } catch (error: any) {
        console.error("Error fetching event for edit:", error.response?.data || error.message);
        toast.error(error.response?.data?.msg || "Failed to load event for editing.");
        navigate('/events');
      }
    };

    fetchEvent();
  }, [id, navigate, form]);


  const onSubmit = async (values: z.infer<typeof eventSchema>) => {
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');

      if (!token || !id || !currentUsername) {
        toast.error("Authentication or event ID missing. Please log in again.");
        navigate('/signin');
        return;
      }

      const eventData = {
        ...values,
        date: values.date.toISOString(),
        // Đảm bảo schedule được gửi đi
        schedule: values.schedule || [],
      };

      const response = await axios.put(`${API_BASE_URL}/events/${id}`, eventData, {
        headers: {
          'x-auth-token': token
        }
      });

      console.log("Event updated:", response.data);
      toast.success("Event updated successfully!");
      navigate(`/events/${id}`, { state: { fromEdit: true } }); // Truyền state: { fromEdit: true }
    } catch (error: any) {
      console.error("Error updating event:", error.response?.data || error.message);
      toast.error(error.response?.data?.msg || "Failed to update event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingPage) {
    return <div className="min-h-screen flex items-center justify-center">Loading event data for editing...</div>;
  }

  // Hàm để thêm một mục lịch trình mới
  const addScheduleItem = () => {
    const currentSchedule = form.getValues("schedule") || [];
    form.setValue("schedule", [...currentSchedule, { time: "", title: "", description: "" }]);
  };

  // Hàm để xóa một mục lịch trình
  const removeScheduleItem = (index: number) => {
    const currentSchedule = form.getValues("schedule") || [];
    const newSchedule = currentSchedule.filter((_, i) => i !== index);
    form.setValue("schedule", newSchedule);
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Event</h1>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* ... Các trường Event Details đã có ... */}
                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter event title" {...field} />
                      </FormControl>
                      <FormDescription>
                        Make your event title clear and memorable
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Event Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Select date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Time</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="7:00 PM"
                              className="pl-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Location */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Event location"
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Music">Music</SelectItem>
                          <SelectItem value="Food & Drink">Food & Drink</SelectItem>
                          <SelectItem value="Business">Business</SelectItem>
                          <SelectItem value="Education">Education</SelectItem>
                          <SelectItem value="Gaming">Gaming</SelectItem>
                          <SelectItem value="Social">Social</SelectItem>
                          <SelectItem value="Health">Health</SelectItem>
                          <SelectItem value="Arts">Arts</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Price and Capacity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Free or enter price"
                              className="pl-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Number of attendees"
                              className="pl-10"
                              {...field}
                              type="number"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your event"
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide details about your event to attract attendees
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Image URL */}
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Image URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/image.jpg" {...field} />
                      </FormControl>
                      <FormDescription>
                        Provide a URL to an image for your event
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Event Schedule Section */}
                <div className="space-y-4 border-t pt-8 mt-8">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Event Schedule</h2>
                    <Button type="button" variant="outline" onClick={addScheduleItem}>
                      <Plus className="h-4 w-4 mr-2" /> Thêm mục
                    </Button>
                  </div>
                  {form.watch("schedule") && form.watch("schedule")!.length > 0 ? (
                    <div className="space-y-4">
                      {form.watch("schedule")!.map((item, index) => (
                        <div key={index} className="border p-4 rounded-md bg-gray-50 relative">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
                            onClick={() => removeScheduleItem(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <FormField
                            control={form.control}
                            name={`schedule.${index}.time`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Thời gian</FormLabel>
                                <FormControl>
                                  <Input placeholder="Ví dụ: 9:00 AM - 10:00 AM" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`schedule.${index}.title`}
                            render={({ field }) => (
                              <FormItem className="mt-2">
                                <FormLabel>Tiêu đề</FormLabel>
                                <FormControl>
                                  <Input placeholder="Ví dụ: Đăng ký & Chào mừng" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`schedule.${index}.description`}
                            render={({ field }) => (
                              <FormItem className="mt-2">
                                <FormLabel>Mô tả (tùy chọn)</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Mô tả chi tiết mục này" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">Chưa có mục lịch trình nào. Nhấn "Thêm mục" để bắt đầu.</p>
                  )}
                </div>

                <div className="flex justify-end space-x-4">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => navigate(-1)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-event-purple hover:bg-event-dark-purple"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Updating..." : "Update Event"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditEvent;