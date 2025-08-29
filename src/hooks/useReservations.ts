import { useContext } from "react";
import { ReservationContext } from "../context/ReservationContext";

export const useReservations = () => useContext(ReservationContext);
