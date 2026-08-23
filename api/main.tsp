import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";

import "./models/common.tsp";
import "./models/public.tsp";
import "./models/admin.tsp";
import "./routes/public.tsp";
import "./routes/admin.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;

@doc("API для веб-приложения бронирования слотов. Публичная часть — анонимные посетители, административная часть — авторизованный администратор (session-based auth).")
@service({
  title: "Booking Calendar API",
})
@server("/api/v1", "Booking Calendar API v1")
namespace BookingCalendar {
}
