// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Events from "././pages/Events";
import EventPage from "./pages/EventPage";
import CreateEvent from "./pages/CreateEvent";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import NotFound from "./pages/NotFound";
import EditEvent from "./pages/EditEvent";
import AdminDashboard from "./pages/AdminDashboard";
import ProfilePage from "./pages/ProfilePage";
import OrganizerProfilePage from './pages/OrganizerProfilePage';
import MyTicketsPage from './pages/MyTicketsPage';
import EventAttendeesPage from './pages/EventAttendeesPage'; 


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/events" element={<Events />} />
          <Route path="/my-tickets" element={<MyTicketsPage />} /> 
          <Route path="/events/:id" element={<EventPage />} />
          <Route path="/create" element={<CreateEvent />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="/edit-event/:id" element={<EditEvent />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/organizers/:organizerId" element={<OrganizerProfilePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/event/:eventId/attendees" element={<EventAttendeesPage />} /> 
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;