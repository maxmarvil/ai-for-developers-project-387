import { Navigate, Route, Routes } from 'react-router-dom';
import { BookingPage } from '@/features/booking/BookingPage';
import { ConfirmationPage } from '@/features/booking/ConfirmationPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<BookingPage />} />
      <Route path="/confirmation" element={<ConfirmationPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
