const HttpStatus = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

const UserRole = Object.freeze({ CUSTOMER: "customer", ADMIN: "admin" });
const OrderStatus = Object.freeze({
  PENDING: "pending",
  CONFIRMED: "confirmed",
  READY_FOR_CLAIMING: "ready_for_claiming",
  CLAIMED: "claimed",
  CANCELLED: "cancelled",
});

export { HttpStatus, OrderStatus, UserRole };
