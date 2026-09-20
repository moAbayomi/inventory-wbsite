// UsersPage.tsx
import { useState } from "react";
import { Plus, Pencil, Trash2, Ban } from "lucide-react";
import { SectionSpinner } from "../components/Spinner";
import { useUsers } from "../hooks/useUser";
import { Modal } from "../components/Modal";
import type { User } from "../types/api";
import { UserForm } from "../components/form/UserForm";
import { InviteUserForm } from "../components/form/inviteUserForm";

type Role = "ADMIN" | "STAFF";

const roleStyles: Record<Role, string> = {
  ADMIN: "bg-[#C9A24B]/15 text-[#946E1F]",
  STAFF: "bg-black/5 text-[#1C1C1A]/55",
};

export default function UsersPage() {
  const { users, updateUser, removeUser, isLoading, isError } = useUsers();
  const [query, setQuery] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [inviting, setInviting] = useState(false);

  if (isLoading) return <SectionSpinner />;
  if (isError || !users) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-[#1C1C1A]/50">
        <Ban size={20} />
        <p className="text-sm">Couldn't load the users page. Try refreshing.</p>
      </div>
    );
  }
  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#1C1C1A]">
            Users
          </h1>
          <p className="text-sm text-[#1C1C1A]/50">
            {users.length} people with access
          </p>
        </div>
        <button
          onClick={() => setInviting(true)}
          className="flex items-center gap-2 rounded-md bg-[#17171A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#17171A]/85"
        >
          <Plus size={16} />
          Invite user
        </button>
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or email"
        className="w-full max-w-xs rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none placeholder:text-[#1C1C1A]/35 focus:border-[#C9A24B]/60"
      />
      <div className="overflow-hidden rounded-lg border border-black/5 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/5 text-left text-xs text-[#1C1C1A]/45">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {filtered.map((user) => (
              <tr
                key={user.email}
                className="group relative hover:bg-black/[0.015]"
              >
                <td className="px-5 py-3 font-medium text-[#1C1C1A]">
                  <span className="relative">{user.name}</span>
                </td>
                <td className="px-5 py-3 text-[#1C1C1A]/60">{user.email}</td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleStyles[user.role]}`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="flex items-center gap-1.5 text-xs text-[#1C1C1A]/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Active
                  </span>
                </td>
                <td className="px-5 py-3 relative ">
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {user.role !== "ADMIN" && (
                      <>
                        <button
                          onClick={() => setEditingUser(user)}
                          aria-label={`Edit ${user.name}`}
                          className="rounded-md p-1.5 text-[#1C1C1A]/45 hover:bg-black/5 hover:text-[#1C1C1A]"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeletingUser(user)}
                          aria-label={`Remove ${user.name}`}
                          className="rounded-md p-1.5 text-[#1C1C1A]/45 hover:bg-black/5 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-[#1C1C1A]/40">
            No users match "{query}".
          </p>
        )}
      </div>
      {editingUser && (
        <Modal onClose={() => setEditingUser(null)}>
          <h2 className="mb-4 text-lg font-semibold">Edit user</h2>
          <UserForm
            user={editingUser}
            isPending={updateUser.isPending}
            onSubmit={(data) => {
              updateUser.mutate(
                { id: editingUser.id, data },
                { onSuccess: () => setEditingUser(null) },
              );
            }}
          />
        </Modal>
      )}
      {deletingUser && (
        <Modal onClose={() => setDeletingUser(null)}>
          <h2 className="text-lg font-semibold">Remove {deletingUser.name}?</h2>
          <p className="mt-1 text-sm text-[#1C1C1A]/60">
            This will revoke their access. They won't be able to sign in.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setDeletingUser(null)}
              className="rounded-md border border-black/10 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                removeUser.mutate(deletingUser.id, {
                  onSuccess: () => setDeletingUser(null),
                });
              }}
              disabled={removeUser.isPending}
              className="rounded-md bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {removeUser.isPending ? "Removing…" : "Remove"}
            </button>
          </div>
        </Modal>
      )}

      {inviting && (
        <Modal onClose={() => setInviting(false)}>
          <h2 className="mb-4 text-lg font-semibold">Invite user</h2>
          <InviteUserForm onSuccess={() => setInviting(false)} />
        </Modal>
      )}
    </div>
  );
}
