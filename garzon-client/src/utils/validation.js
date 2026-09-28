// @ts-check
// Client input validation for immediate feedback before API requests.
/** @extends {Error} */
export class InputError extends Error {
  /** @param {string} field @param {string} message */
  constructor(field, message) {
    super(message);
    this.fieldErrors = { [field]: message };
  }
}
/** @param {string} field @param {string} message @returns {never} */
function fail(field, message) {
  throw new InputError(field, message);
}
/** @param {unknown} value @param {string} field @param {number} min @param {number} max */
export function text(value, field, min, max) {
  if (typeof value !== "string") fail(field, `${field} must be text.`);
  if (Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || (code >= 127 && code <= 159);
  }))
    fail(field, `${field} contains unsupported control characters.`);
  const result = value.trim();
  if (result.length < min || result.length > max)
    fail(field, `${field} must contain ${min}–${max} characters.`);
  return result;
}
/** @param {unknown} value @param {string} field @param {number} min @param {number} max @param {boolean} integer @param {boolean} [strings] */
export function numeric(value, field, min, max, integer, strings = false) {
  if (strings && typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value))
    value = Number(value);
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  ) {
    fail(
      field,
      `${field} must be ${integer ? "a whole number" : "a number"} between ${min} and ${max}.`,
    );
  }
  if (!integer && Math.abs(value * 100 - Math.round(value * 100)) > 0.000001)
    fail(field, `${field} supports at most two decimal places.`);
  return value;
}
/** @param {unknown} value @param {string} field */
export function objectId(value, field) {
  if (typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value))
    fail(field, `${field} must be a valid record ID.`);
  return value;
}
/** @param {unknown} value @param {string} [field] @returns {Record<string, unknown>} */
function object(value, field = "body") {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(field, `${field} must be an object.`);
  return /** @type {Record<string, unknown>} */ (value);
}
/** @param {unknown} value @param {string} [field] @param {number} [depth] */
export function safeKeys(value, field = "input", depth = 0) {
  if (depth > 8) fail(field, "Input is nested too deeply.");
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (
        key.startsWith("$") ||
        /[.[\]]/.test(key) ||
        ["__proto__", "constructor", "prototype"].includes(key)
      )
        fail(field, "Unsupported input field.");
      safeKeys(child, field, depth + 1);
    }
  }
}
/** @param {string} field @param {unknown} value @param {string} resource @param {boolean} strings @returns {unknown} */
function fieldValue(field, value, resource, strings) {
  if (["firstName", "lastName", "recipientName"].includes(field)) {
    const name = text(
      value,
      field,
      2,
      field === "recipientName" ? 160 : 80,
    ).replace(/ +/g, " ");
    if (!/^[\p{L}\p{M} .’'-]+$/u.test(name) || !/\p{L}/u.test(name))
      fail(field, `Please enter a valid ${field}.`);
    return name;
  }
  if (field === "studentNumber") {
    const studentNumber = text(value, field, 11, 11);
    if (!/^\d{4}-\d{6}$/.test(studentNumber))
      fail(field, "Student number must use the format ####-###### (e.g. 2023-123456).");
    return studentNumber;
  }
  if (field === "course") return text(value, field, 2, 120);
  if (field === "yearLevel") return text(value, field, 1, 30);
  if (field === "email") {
    const email = text(value, field, 3, 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      fail(field, "Please enter a valid email address.");
    return email;
  }
  if (["password", "currentPassword", "newPassword"].includes(field)) {
    if (
      typeof value !== "string" ||
      value.length < (field === "currentPassword" ? 1 : 8) ||
      new TextEncoder().encode(value).length > 72
    )
      fail(
        field,
        `${field} must contain ${field === "currentPassword" ? 1 : 8} or more characters and at most 72 UTF-8 bytes.`,
      );
    return value;
  }
  if (field === "phone") {
    const phone = text(value, field, 11, 13);
    if (!/^(?:\+63|0)9\d{9}$/.test(phone))
      fail(field, "Please enter a valid Philippine mobile number.");
    return phone;
  }
  if (field === "address") {
    const address = object(value, field);
    const limits = { street: 160, city: 80, province: 80, postalCode: 12 };
    return Object.fromEntries(
      Object.entries(address).map(([key, entry]) => {
        if (!Object.hasOwn(limits, key))
          fail("address", "Unsupported address field.");
        return [
          key,
          text(entry, key, 0, limits[/** @type {keyof typeof limits} */ (key)]),
        ];
      }),
    );
  }
  if (field === "name")
    return text(value, field, 2, resource === "categories" ? 80 : 120);
  if (field === "sku") {
    const sku = text(value, field, 3, 40).toUpperCase();
    if (!/^[A-Z0-9_-]+$/.test(sku))
      fail(
        field,
        "SKU may contain letters, numbers, hyphens, and underscores only.",
      );
    return sku;
  }
  if (field === "supplier") return text(value, field, 1, 120);
  if (field === "content") return text(value, field, 10, 1000);
  if (field === "price")
    return numeric(value, field, 0.01, 1000000, false, strings);
  if (field === "revision") return numeric(value, field, 0, Number.MAX_SAFE_INTEGER, true, strings);
  if (field === "stock")
    return numeric(value, field, 0, 1000000, true, strings);
  if (field === "quantity") return numeric(value, field, 1, 100, true, strings);
  if (field === "rating") return numeric(value, field, 1, 5, true, strings);
  if (field.endsWith("Id")) return objectId(value, field);
  if (["isActive", "isHidden", "isFlagged"].includes(field)) {
    if (strings && ["true", "false"].includes(/** @type {string} */ (value)))
      return value === "true";
    if (typeof value !== "boolean")
      fail(field, `${field} must be true or false.`);
    return value;
  }
  if (field === "status") {
    if (
      ![
        "pending",
        "confirmed",
        "ready_for_claiming",
        "claimed",
        "cancelled",
      ].includes(/** @type {string} */ (value))
    )
      fail(field, "Choose a valid order status.");
    return value;
  }
  return fail(field, "Unsupported input field.");
}
/** Validate only fields owned by each operation. Authorization remains on the server.
 * @param {string} path @param {string} method @param {unknown} body @param {boolean} [multipart]
 */
export function validateBody(path, method, body, multipart = false) {
  const [resource, action, detail] = path
    .replace(/^\/api\/v1/, "")
    .split("?")[0]
    .split("/")
    .filter(Boolean);
  if (!["POST", "PATCH", "PUT"].includes(method)) return body;
  const input = object(body ?? {});
  safeKeys(input);
  /** @type {string[]} */ let allowed = [];
  /** @type {string[]} */ let required = [];
  const profile = ["firstName", "lastName", "studentNumber", "course", "yearLevel", "phone", "address"];
  if (resource === "users") {
    if (action === "register") {
      allowed = [...profile, "email", "password"];
      required = ["firstName", "lastName", "studentNumber", "course", "yearLevel", "email", "password"];
    } else if (action === "login") {
      allowed = required = ["email", "password"];
    } else if (detail === "password") {
      allowed = required = ["currentPassword", "newPassword"];
    } else if (detail === "status") {
      allowed = required = ["isActive"];
    } else if (method === "PATCH")
      allowed = action === "me" ? profile : [...profile, "email"];
  } else if (resource === "products") {
    allowed =
      detail === "status"
        ? ["isActive"]
        : [
            "name",
            "sku",
            "price",
            "stock",
            "categoryId",
            "supplier",
            "isActive",
          ];
    if (method === "POST" && !detail)
      required = ["name", "sku", "price", "stock", "categoryId"];
    if (detail === "status") required = ["isActive"];
    if (detail === "upload-image") allowed = [];
  } else if (resource === "categories") {
    allowed = ["name", "isActive"];
    if (method === "POST") required = ["name"];
  } else if (resource === "carts") {
    allowed = method === "POST" ? ["productId", "quantity"] : ["quantity"];
    required = method === "POST" ? ["productId"] : ["quantity"];
  } else if (resource === "reviews") {
    allowed =
      method === "POST"
        ? ["productId", "rating", "content"]
        : ["rating", "content", "isHidden", "isFlagged"];
    if (method === "POST") required = allowed;
  } else if (resource === "orders" && method === "POST" && !action) {
    allowed = required = ["cartId", "revision"];
  } else if (resource === "orders" && detail === "status")
    allowed = required = ["status"];
  for (const field of required)
    if (input[field] === undefined) fail(field, `${field} is required.`);
  if (
    method === "PATCH" &&
    allowed.length &&
    !Object.keys(input).length &&
    !multipart
  )
    fail("body", "Provide at least one field to update.");
  return Object.fromEntries(
    Object.entries(input).map(([field, value]) => {
      if (!allowed.includes(field))
        fail(field, `${field} cannot be changed here.`);
      // Login verifies legacy passwords without imposing registration minimums.
      return [
        field,
        fieldValue(
          action === "login" && field === "password"
            ? "currentPassword"
            : field,
          value,
          resource,
          multipart,
        ),
      ];
    }),
  );
}
/** @param {Record<string, unknown>} query */
export function validateQuery(query) {
  safeKeys(query);
  for (const [key, value] of Object.entries(query)) {
    text(value, key, 0, 120);
    if (key.endsWith("Id")) objectId(value, key);
    if (key === "page") numeric(value, key, 1, 100000, true, true);
    if (key === "limit") numeric(value, key, 1, 100, true, true);
    if (key === "rating") numeric(value, key, 1, 5, true, true);
    if (["minPrice", "maxPrice"].includes(key))
      numeric(value, key, 0, 1000000, false, true);
  }
  if (
    query.minPrice !== undefined &&
    query.maxPrice !== undefined &&
    Number(query.minPrice) > Number(query.maxPrice)
  )
    fail("minPrice", "Minimum price cannot exceed maximum price.");
}
