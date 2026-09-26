"use client";

import { api, unwrap } from "./api";

export interface HotelHostBooking {
  _id: string;
  status: "pending" | "confirmed" | "paid" | "completed" | "cancelled" | "expired";
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  guest?: { firstName?: string; lastName?: string; email?: string };
  property?: { _id: string; name?: string };
  unit?: { _id: string; unitNumber?: string; listingTitle?: string };
}

export const hotelBookingApi = {
  async forHost(): Promise<HotelHostBooking[]> {
    const res = await api.get("/hotel-bookings/host");
    return unwrap(res.data) as HotelHostBooking[];
  },
};
