import { createAdminClient } from "./oauth.ts";

async function listUserFiles(
  admin: ReturnType<typeof createAdminClient>,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  let offset = 0;
  while (true) {
    const storage = admin.storage.from("university-files");
    const { data, error } = await storage.list(prefix, { limit: 100, offset });
    if (error) throw new Error("Could not list private account files.");

    for (const entry of data ?? []) {
      const path = `${prefix}/${entry.name}`;
      if (entry.id === null) {
        paths.push(...await listUserFiles(admin, path));
      } else {
        paths.push(path);
      }
    }

    if (!data || data.length < 100) break;
    offset += 100;
  }
  return paths;
}

export async function deleteUserAccount(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<void> {
  const storage = admin.storage.from("university-files");
  const files = await listUserFiles(admin, userId);
  for (let index = 0; index < files.length; index += 100) {
    const { error } = await storage.remove(files.slice(index, index + 100));
    if (error) throw new Error("Could not remove all private files; the account was not deleted.");
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error("Account deletion failed. Please try again or contact support.");
}
