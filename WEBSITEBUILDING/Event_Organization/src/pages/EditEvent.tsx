import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, X } from "lucide-react";
import { toast } from "sonner";
import axios from 'axios';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const API_BASE_URL = 'http://localhost:5000/api';

const scheduleItemSchema = z.object({
  time: z.string().min(1, "Thời gian là bắt buộc"), // Việt hóa
  title: z.string().min(1, "Tiêu đề là bắt buộc"), // Việt hóa
  description: z.string().optional(),
});

const priceSchema = z.object({
  amount: z.coerce.number({ invalid_type_error: "Giá vé phải là số." }).min(0, "Giá vé không thể âm."), // Việt hóa
  currency: z.enum(['vnd', 'usd'], { required_error: "Vui lòng chọn đơn vị tiền tệ." }), // Việt hóa
});

const eventSchema = z.object({
  title: z.string().min(5, "Tiêu đề phải có ít nhất 5 ký tự."), // Việt hóa
  date: z.date({ required_error: "Ngày diễn ra sự kiện là bắt buộc." }), // Việt hóa
  time: z.string().min(1, "Thời gian diễn ra sự kiện là bắt buộc."), // Việt hóa
  location: z.string().min(3, "Địa điểm phải có ít nhất 3 ký tự."), // Việt hóa
  category: z.string().min(1, "Vui lòng chọn một danh mục."), // Việt hóa
  isFree: z.boolean().default(true),
  price: priceSchema.optional(),
  capacity: z.string().optional(),
  description: z.string().min(20, "Mô tả phải có ít nhất 20 ký tự."), // Việt hóa
  image: z.string().url("Vui lòng nhập một URL hình ảnh hợp lệ.").optional().or(z.literal('')), // Việt hóa
  schedule: z.array(scheduleItemSchema).optional(),
}).refine((data) => {
  if (!data.isFree) {
    return data.price && data.price.amount > 0 && data.price.currency;
  }
  return true;
}, {
  path: ['price'],
  message: "Vui lòng nhập giá vé và đơn vị nếu sự kiện không miễn phí.", // Việt hóa
});

const EditEvent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
  });

  const isFree = form.watch("isFree");

  useEffect(() => {
    if (isFree) {
      form.setValue("price", undefined);
    }
  }, [isFree, form]);

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/events/${id}`);
        form.reset({
          title: data.title,
          date: new Date(data.date),
          time: data.time,
          location: data.location,
          category: data.category,
          isFree: data.isFree,
          price: data.price || { amount: 0, currency: 'vnd' },
          capacity: data.capacity?.toString() || '',
          description: data.description,
          image: data.image,
          schedule: data.schedule || [],
        });
      } catch (error) {
        toast.error("Không thể tải dữ liệu sự kiện."); // Việt hóa
        navigate('/events');
      } finally {
        setIsLoading(false);
      }
    };
    if (id) {
      fetchEventData();
    }
  }, [id, form, navigate]);

  const onSubmit = async (values: z.infer<typeof eventSchema>) => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      console.log("Đang gửi giá trị:", values); // Việt hóa

      const eventData = {
        ...values,
        date: values.date.toISOString(),
        price: values.isFree
          ? undefined
          : {
              amount: Number(values.price?.amount || 0),
              currency: values.price?.currency || 'vnd',
            },
      };

      await axios.put(`${API_BASE_URL}/events/${id}`, eventData, {
        headers: { 'x-auth-token': token }
      });
      toast.success("Cập nhật sự kiện thành công!"); // Việt hóa
      navigate(`/events/${id}`, { state: { fromEdit: true } });
    } catch (error: any) {
      console.error("Lỗi khi cập nhật:", error); // Việt hóa
      toast.error(error.response?.data?.msg || error.message || "Cập nhật sự kiện thất bại."); // Việt hóa
    } finally {
      setIsSubmitting(false);
    }
  };

  const addScheduleItem = () => {
    const schedule = form.getValues('schedule') || [];
    form.setValue('schedule', [...schedule, { time: '', title: '', description: '' }]);
  };

  const removeScheduleItem = (index: number) => {
    const schedule = form.getValues('schedule') || [];
    form.setValue('schedule', schedule.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Đang tải dữ liệu sự kiện...</div>; // Việt hóa
  }
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-lg">
          <h1 className="text-3xl font-bold mb-8">Chỉnh sửa sự kiện</h1> {/* Việt hóa */}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Tên sự kiện</FormLabel> {/* Việt hóa */}
                            <FormControl>
                                <Input placeholder="Ví dụ: Đêm nhạc Acoustic" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Ngày diễn ra</FormLabel> {/* Việt hóa */}
                                <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button
                                        variant={"outline"}
                                        className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {field.value ? format(field.value, "PPP") : <span>Chọn ngày</span>} {/* Việt hóa */}
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) } initialFocus />
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
                                <FormLabel>Thời gian</FormLabel> {/* Việt hóa */}
                                <FormControl>
                                <Input placeholder="Ví dụ: 7:00 PM - 9:00 PM" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        </div>

                        <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Địa điểm</FormLabel> {/* Việt hóa */}
                            <FormControl>
                                <Input placeholder="Ví dụ: Quận 1, TP.HCM" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />

                        <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Danh mục</FormLabel> {/* Việt hóa */}
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Chọn danh mục cho sự kiện" /></SelectTrigger> {/* Việt hóa */}
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="Music">Âm nhạc</SelectItem> {/* Việt hóa */}
                                <SelectItem value="Food & Drink">Ẩm thực</SelectItem> {/* Việt hóa */}
                                <SelectItem value="Business">Kinh doanh</SelectItem> {/* Việt hóa */}
                                <SelectItem value="Education">Giáo dục</SelectItem> {/* Việt hóa */}
                                <SelectItem value="Gaming">Trò chơi</SelectItem> {/* Việt hóa */}
                                <SelectItem value="Social">Xã hội</SelectItem> {/* Việt hóa */}

                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />

                        <div className="space-y-4 border-t pt-6">
                            <FormField
                                control={form.control}
                                name="isFree"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-4 border rounded-lg shadow-sm">
                                        <FormControl>
                                            <Checkbox
                                              checked={field.value}
                                              onCheckedChange={(checked) => field.onChange(!!checked)}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal">Sự kiện này miễn phí</FormLabel> {/* Việt hóa */}
                                    </FormItem>
                                )}
                            />

                            {!isFree && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="price.amount"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Giá vé</FormLabel> {/* Việt hóa */}
                                            <FormControl>
                                                <Input type="number" placeholder="100000" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="price.currency"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Đơn vị</FormLabel> {/* Việt hóa */}
                                            <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Chọn đơn vị" /></SelectTrigger> {/* Việt hóa */}
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="vnd">VND</SelectItem>
                                                <SelectItem value="usd">USD</SelectItem>
                                            </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                </div>
                            )}
                        </div>

                        <FormField
                            control={form.control}
                            name="capacity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sức chứa (tùy chọn)</FormLabel> {/* Việt hóa */}
                                    <FormControl>
                                        <Input type="number" placeholder="100" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Mô tả sự kiện</FormLabel> {/* Việt hóa */}
                            <FormControl>
                                <Textarea placeholder="Nói vài điều về sự kiện của bạn..." className="min-h-[150px]" {...field} /> {/* Việt hóa */}
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />

                        <FormField
                        control={form.control}
                        name="image"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>URL Hình ảnh sự kiện</FormLabel> {/* Việt hóa */}
                            <FormControl>
                                <Input placeholder="https://..." {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />

                        <div className="space-y-4 border-t pt-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Lịch trình sự kiện</h3> {/* Việt hóa */}
                            <Button type="button" variant="outline" size="sm" onClick={addScheduleItem}>
                            <Plus className="h-4 w-4 mr-2" /> Thêm {/* Việt hóa */}
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {form.watch("schedule")?.map((item, index) => (
                                <div key={index} className="flex gap-4 items-start border p-4 rounded-lg bg-gray-50">
                                    <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name={`schedule.${index}.time`}
                                            render={({ field }) => <FormItem><FormLabel>Thời gian</FormLabel><FormControl><Input placeholder="9:00 AM" {...field} /></FormControl><FormMessage /></FormItem>} 
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`schedule.${index}.title`}
                                            render={({ field }) => <FormItem><FormLabel>Tiêu đề</FormLabel><FormControl><Input placeholder="Khai mạc" {...field} /></FormControl><FormMessage /></FormItem>} 
                                        />
                                        <div className="sm:col-span-2">
                                        <FormField
                                            control={form.control}
                                            name={`schedule.${index}.description`}
                                            render={({ field }) => <FormItem><FormLabel>Mô tả (tùy chọn)</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>} 
                                        />
                                        </div>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeScheduleItem(index)}><X className="h-4 w-4 text-gray-500" /></Button>
                                </div>
                            ))}
                        </div>
                        </div>

                        <div className="flex justify-end gap-4 pt-8 border-t">
                        <Button type="button" variant="outline" onClick={() => navigate(`/events/${id}`)}>Hủy</Button> {/* Việt hóa */}
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Đang cập nhật..." : "Cập nhật sự kiện"} {/* Việt hóa */}
                        </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </main>
        <Footer />
    </div>
  );
};

export default EditEvent;