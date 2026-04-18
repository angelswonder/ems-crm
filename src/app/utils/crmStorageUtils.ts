import { CRMFolder, CRMFile } from '../crm/FolderManagement';
import { DashboardTemplate } from '../crm/DashboardTemplateManager';

// ===== FOLDER UTILITIES =====

const FOLDERS_STORAGE_KEY = 'crm_folders';
const FILES_STORAGE_KEY = 'crm_files';

export function saveFolders(folders: CRMFolder[]): void {
  localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
}

export function loadFolders(): CRMFolder[] {
  const stored = localStorage.getItem(FOLDERS_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveFiles(files: CRMFile[]): void {
  localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(files));
}

export function loadFiles(): CRMFile[] {
  const stored = localStorage.getItem(FILES_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function getFolderTree(folders: CRMFolder[], parentId?: string): CRMFolder[] {
  return folders.filter((f) => (parentId ? f.parentId === parentId : !f.parentId));
}

export function getSubFolders(folders: CRMFolder[], parentId: string): CRMFolder[] {
  return folders.filter((f) => f.parentId === parentId);
}

export function getFolderPath(folders: CRMFolder[], folderId: string): CRMFolder[] {
  const path: CRMFolder[] = [];
  let current = folders.find((f) => f.id === folderId);
  
  while (current) {
    path.unshift(current);
    current = current.parentId ? folders.find((f) => f.id === current!.parentId) : undefined;
  }
  
  return path;
}

export function searchFolders(folders: CRMFolder[], query: string): CRMFolder[] {
  const lowerQuery = query.toLowerCase();
  return folders.filter((f) =>
    f.name.toLowerCase().includes(lowerQuery) ||
    f.description?.toLowerCase().includes(lowerQuery)
  );
}

export function shareFolder(folder: CRMFolder, userIds: string[]): CRMFolder {
  return {
    ...folder,
    isShared: true,
    sharedWith: [...(folder.sharedWith || []), ...userIds],
    permissions: 'shared',
  };
}

export function unshareFolder(folder: CRMFolder, userIds: string[]): CRMFolder {
  const updatedSharedWith = (folder.sharedWith || []).filter((id) => !userIds.includes(id));
  return {
    ...folder,
    isShared: updatedSharedWith.length > 0,
    sharedWith: updatedSharedWith,
    permissions: updatedSharedWith.length === 0 ? 'private' : 'shared',
  };
}

// ===== TEMPLATE UTILITIES =====

const TEMPLATES_STORAGE_KEY = 'crm_templates';
const USER_TEMPLATE_PREFS_KEY = 'crm_user_template_prefs';

export function saveTemplates(templates: DashboardTemplate[]): void {
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}

export function loadTemplates(): DashboardTemplate[] {
  const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveUserTemplatePreferences(userId: string, templateId: string, preferences: any): void {
  const prefs = JSON.parse(localStorage.getItem(USER_TEMPLATE_PREFS_KEY) || '{}');
  prefs[userId] = { templateId, ...preferences, lastSet: new Date().toISOString() };
  localStorage.setItem(USER_TEMPLATE_PREFS_KEY, JSON.stringify(prefs));
}

export function getUserTemplatePreferences(userId: string): { templateId: string } | null {
  const prefs = JSON.parse(localStorage.getItem(USER_TEMPLATE_PREFS_KEY) || '{}');
  return prefs[userId] || null;
}

export function getDefaultTemplateForRole(templates: DashboardTemplate[], role: string): DashboardTemplate | null {
  const roleTemplates = templates.filter(
    (t) => t.assignedRoles?.includes(role) && t.isDefault
  );
  return roleTemplates[0] || null;
}

export function getTemplatesForRole(templates: DashboardTemplate[], role: string): DashboardTemplate[] {
  return templates.filter((t) => t.assignedRoles?.includes(role) || t.assignedRoles?.includes('*'));
}

export function getTemplatesForUser(templates: DashboardTemplate[], userId: string): DashboardTemplate[] {
  return templates.filter((t) => t.assignedTo?.includes(userId) || !t.assignedTo?.length);
}

export function getPinnedTemplates(templates: DashboardTemplate[]): DashboardTemplate[] {
  return templates.filter((t) => t.isPinned);
}

export function searchTemplates(templates: DashboardTemplate[], query: string): DashboardTemplate[] {
  const lowerQuery = query.toLowerCase();
  return templates.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery)
  );
}

export function getTemplatesByMode(
  templates: DashboardTemplate[],
  mode: 'overview' | 'pipeline' | 'activity'
): DashboardTemplate[] {
  return templates.filter((t) => t.mode === mode);
}

export function assignTemplateToRole(template: DashboardTemplate, roles: string[]): DashboardTemplate {
  return {
    ...template,
    assignedRoles: [...(template.assignedRoles || []), ...roles],
  };
}

export function unassignTemplateFromRole(template: DashboardTemplate, roles: string[]): DashboardTemplate {
  return {
    ...template,
    assignedRoles: (template.assignedRoles || []).filter((r) => !roles.includes(r)),
  };
}

export function assignTemplateToUser(template: DashboardTemplate, userIds: string[]): DashboardTemplate {
  return {
    ...template,
    assignedTo: [...(template.assignedTo || []), ...userIds],
  };
}

export function unassignTemplateFromUser(template: DashboardTemplate, userIds: string[]): DashboardTemplate {
  return {
    ...template,
    assignedTo: (template.assignedTo || []).filter((u) => !userIds.includes(u)),
  };
}

// ===== COMBINED UTILITIES =====

export interface CRMState {
  folders: CRMFolder[];
  files: CRMFile[];
  templates: DashboardTemplate[];
}

export function loadAllCRMData(): CRMState {
  return {
    folders: loadFolders(),
    files: loadFiles(),
    templates: loadTemplates(),
  };
}

export function saveAllCRMData(state: CRMState): void {
  saveFolders(state.folders);
  saveFiles(state.files);
  saveTemplates(state.templates);
}

export function exportCRMData(state: CRMState): string {
  return JSON.stringify(state, null, 2);
}

export function importCRMData(jsonString: string): CRMState {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.folders && parsed.files && parsed.templates) {
      saveAllCRMData(parsed);
      return parsed;
    }
    throw new Error('Invalid CRM data format');
  } catch (error) {
    throw new Error(`Failed to import CRM data: ${error}`);
  }
}
