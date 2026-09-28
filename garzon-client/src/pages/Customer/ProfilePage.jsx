import { useState } from "react";
import { apiRequest, clearStoredToken } from "../../api/apiClient.js";
import { useAuth } from "../../auth/authContext.js";
import { notify } from "../../utils/toast.js";
import {
  useConfirmation,
  useUnsavedForm,
  PasswordInput,
  StoreCard,
  StoreIcon,
  StorePage,
  StorePageHeader,
} from "../../components/StoreUI.jsx";

const fieldClass =
  "w-full rounded-lg border border-[#e3e7f0] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#d4af37] focus:ring-2 focus:ring-[#f6ecc9]";

const ProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const { confirm, confirmation } = useConfirmation();
  const { formRef, onFormChange, markSaved, guardDiscard } = useUnsavedForm(confirm);
  const [tab, setTab] = useState("info");
  const initials =
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();

  const updateProfile = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await apiRequest("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          studentNumber: form.get("studentNumber") || undefined,
          course: form.get("course") || undefined,
          yearLevel: form.get("yearLevel") || undefined,
          phone: form.get("phone"),
          address: {
            street: form.get("street"),
            city: form.get("city"),
            province: form.get("province"),
            postalCode: form.get("postalCode"),
          },
        }),
      });
      markSaved();
      await refreshUser();
      notify.success("Profile updated successfully.");
    } catch (requestError) {
      notify.error(requestError.message);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) {
      notify.error("New password and confirmation do not match.");
      return;
    }
    try {
      await apiRequest("/users/me/password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: form.get("currentPassword"),
          newPassword,
        }),
      });
      formElement.reset();
      markSaved();
      clearStoredToken();
      notify.success("Password changed successfully.");
    } catch (requestError) {
      notify.error(requestError.message);
    }
  };

  return (
    <StorePage className="mx-auto max-w-4xl">
      {confirmation}
      <StorePageHeader
        eyebrow="Account"
        title="Your profile"
        description="View and update your account and campus pickup information."
      />
      <div className="mb-6 flex gap-2">
        {[
          ["info", "Personal info"],
          ["password", "Change password"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => key !== tab && guardDiscard(() => setTab(key))}
            className={`rounded-full px-4 py-2 text-xs font-semibold ${tab === key ? "bg-[#0b1b46] text-white" : "border border-[#e3e7f0] bg-white text-[#101828]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <StoreCard className="p-6">
        {tab === "info" ? (
          <form key="info" ref={formRef} onChange={onFormChange} onSubmit={updateProfile}>
            <div className="mb-6 flex items-center gap-4">
              <span className="font-display grid h-16 w-16 place-items-center rounded-full bg-[#0b1b46] text-lg font-extrabold text-[#d4af37]">
                {initials}
              </span>
              <div>
                <p className="font-display font-bold">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-[#64748b]">{user.email}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                First name
                <input
                  name="firstName"
                  required
                  minLength="2"
                  defaultValue={user.firstName}
                  className={`${fieldClass} mt-1 normal-case tracking-normal text-[#101828]`}
                />
              </label>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                Last name
                <input
                  name="lastName"
                  required
                  minLength="2"
                  defaultValue={user.lastName}
                  className={`${fieldClass} mt-1 normal-case tracking-normal text-[#101828]`}
                />
              </label>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                Student number
                <input name="studentNumber" type="text" required={user.role === "customer" || Boolean(user.studentNumber)} pattern="[0-9]{4}[-][0-9]{6}" minLength="11" maxLength="11" defaultValue={user.studentNumber ?? ""} placeholder="2023-123456" title="Use the format ####-######" className={`${fieldClass} mt-1 normal-case tracking-normal text-[#101828]`} />
              </label>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                Course
                <input name="course" required={user.role === "customer" || Boolean(user.course)} minLength="2" maxLength="120" defaultValue={user.course ?? ""} placeholder="BSIT" className={`${fieldClass} mt-1 normal-case tracking-normal text-[#101828]`} />
              </label>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                Year level
                <input name="yearLevel" required={user.role === "customer" || Boolean(user.yearLevel)} minLength="1" maxLength="30" defaultValue={user.yearLevel ?? ""} placeholder="4th Year" className={`${fieldClass} mt-1 normal-case tracking-normal text-[#101828]`} />
              </label>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                Email
                <input
                  value={user.email}
                  disabled
                  className={`${fieldClass} mt-1 bg-slate-100 normal-case tracking-normal text-[#64748b]`}
                />
              </label>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                Phone
                <input
                  name="phone"
                  required
                  defaultValue={user.phone ?? ""}
                  pattern="(?:\+63|0)9\d{9}"
                  className={`${fieldClass} mt-1 normal-case tracking-normal text-[#101828]`}
                  placeholder="09XXXXXXXXX"
                />
              </label>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b] sm:col-span-2">
                Street
                <input
                  name="street"
                  required
                  defaultValue={user.address?.street ?? ""}
                  className={`${fieldClass} mt-1 normal-case tracking-normal text-[#101828]`}
                />
              </label>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                City
                <input
                  name="city"
                  required
                  defaultValue={user.address?.city ?? ""}
                  className={`${fieldClass} mt-1 normal-case tracking-normal text-[#101828]`}
                />
              </label>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                Province
                <input
                  name="province"
                  required
                  defaultValue={user.address?.province ?? ""}
                  className={`${fieldClass} mt-1 normal-case tracking-normal text-[#101828]`}
                />
              </label>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                Postal code
                <input
                  name="postalCode"
                  required
                  defaultValue={user.address?.postalCode ?? ""}
                  className={`${fieldClass} mt-1 normal-case tracking-normal text-[#101828]`}
                />
              </label>
            </div>
            <button className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0b1b46] px-4 py-2.5 text-sm font-semibold text-white">
              <StoreIcon name="edit" className="h-4 w-4" />
              Save changes
            </button>
          </form>
        ) : (
          <form key="password" ref={formRef} onChange={onFormChange} onSubmit={changePassword} className="max-w-sm space-y-4">
            <h2 className="font-display text-sm font-bold">
              Update your password
            </h2>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
              Current password
              <PasswordInput
                name="currentPassword"
                id="current-password"
                required
                autoComplete="current-password"
                className={`${fieldClass} mt-1`}
              />
            </label>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
              New password
              <PasswordInput
                name="newPassword"
                id="new-password"
                required
                minLength="8"
                autoComplete="new-password"
                className={`${fieldClass} mt-1`}
              />
            </label>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
              Confirm new password
              <PasswordInput
                name="confirmPassword"
                id="confirm-password"
                required
                minLength="8"
                autoComplete="new-password"
                className={`${fieldClass} mt-1`}
              />
            </label>
            <button className="rounded-lg bg-[#0b1b46] px-4 py-2.5 text-sm font-semibold text-white">
              Update password
            </button>
          </form>
        )}
      </StoreCard>
    </StorePage>
  );
};

export default ProfilePage;
