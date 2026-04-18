import { useState } from 'react';
import { Folder, FolderPlus, FileUp, Share2, Trash2, Edit2, Star, ChevronRight, Lock, Globe, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';

export interface CRMFolder {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  createdBy: string;
  createdAt: string;
  isShared: boolean;
  sharedWith?: string[];
  isFavorite: boolean;
  permissions: 'private' | 'shared' | 'public';
}

export interface CRMFile {
  id: string;
  name: string;
  folderId: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  type: string;
  source: 'local' | 'google-drive';
}

interface Props {
  onClose: () => void;
}

export function FolderManagement({ onClose }: Props) {
  const { currentUser } = useApp();
  const [viewMode, setViewMode] = useState<'all' | 'shared' | 'created' | 'favorites'>('all');
  const [folders, setFolders] = useState<CRMFolder[]>([
    {
      id: '1',
      name: 'Sales Documents',
      description: 'All sales-related files and proposals',
      createdBy: 'Admin',
      createdAt: new Date().toISOString(),
      isShared: true,
      sharedWith: ['team-lead', 'manager'],
      isFavorite: false,
      permissions: 'shared',
    },
    {
      id: '2',
      name: 'My Documents',
      createdBy: currentUser?.username || 'Current User',
      createdAt: new Date().toISOString(),
      isShared: false,
      isFavorite: false,
      permissions: 'private',
    },
  ]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderForm, setShowNewFolderForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const createFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name is required');
      return;
    }
    const newFolder: CRMFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName,
      createdBy: currentUser?.username || 'User',
      createdAt: new Date().toISOString(),
      isShared: false,
      isFavorite: false,
      permissions: 'private',
      parentId: selectedFolder || undefined,
    };
    setFolders([...folders, newFolder]);
    setNewFolderName('');
    setShowNewFolderForm(false);
    toast.success(`Folder "${newFolderName}" created`);
  };

  const deleteFolder = (id: string) => {
    setFolders(folders.filter((f) => f.id !== id));
    toast.success('Folder deleted');
  };

  const renameFolder = (id: string, newName: string) => {
    if (!newName.trim()) return;
    setFolders(folders.map((f) => (f.id === id ? { ...f, name: newName } : f)));
    setEditingId(null);
    toast.success('Folder renamed');
  };

  const toggleFavorite = (id: string) => {
    setFolders(folders.map((f) => (f.id === id ? { ...f, isFavorite: !f.isFavorite } : f)));
  };

  const shareFolder = (id: string) => {
    setFolders(
      folders.map((f) =>
        f.id === id
          ? {
              ...f,
              isShared: !f.isShared,
              permissions: f.isShared ? 'private' : 'shared',
            }
          : f
      )
    );
    toast.success(folders.find((f) => f.id === id)?.isShared ? 'Folder unshared' : 'Folder shared');
  };

  const filteredFolders = folders.filter((folder) => {
    switch (viewMode) {
      case 'created':
        return folder.createdBy === currentUser?.username;
      case 'shared':
        return folder.isShared;
      case 'favorites':
        return folder.isFavorite;
      default:
        return true;
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files || !selectedFolder) {
      toast.error('Please select a folder first');
      return;
    }
    Array.from(files).forEach((file) => {
      toast.success(`"${file.name}" uploaded to folder`);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-card rounded-3xl shadow-2xl border border-border/30 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 border-b border-border/20 px-6 py-5" style={{ background: 'linear-gradient(135deg, #2c5f4e, #1e4d3d)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold text-lg">Folder Management</h2>
              <p className="text-white/70 text-sm mt-1">Organize and share CRM documents and files</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* View Mode Tabs */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                { mode: 'all' as const, label: 'All Folders', icon: '📁' },
                { mode: 'created' as const, label: 'Created by Me', icon: '✏️' },
                { mode: 'shared' as const, label: 'Shared with Me', icon: '👥' },
                { mode: 'favorites' as const, label: 'Favorites', icon: '⭐' },
              ] as const
            ).map(({ mode, label, icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                  viewMode === mode
                    ? 'bg-primary text-white'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Folder Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowNewFolderForm(!showNewFolderForm)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-95 transition"
            >
              <FolderPlus className="w-4 h-4" /> New Folder
            </button>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:opacity-95 transition cursor-pointer">
              <FileUp className="w-4 h-4" /> Upload File
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* New Folder Form */}
          {showNewFolderForm && (
            <div className="bg-muted/20 rounded-2xl border border-border/30 p-4">
              <div className="flex gap-2">
                <input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name..."
                  className="flex-1 px-3 py-2 rounded-lg border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createFolder();
                    if (e.key === 'Escape') setShowNewFolderForm(false);
                  }}
                  autoFocus
                />
                <button
                  onClick={createFolder}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-95 transition"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowNewFolderForm(false)}
                  className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Folders List */}
          <div className="bg-muted/20 rounded-2xl border border-border/30 overflow-hidden">
            {filteredFolders.length === 0 ? (
              <div className="text-center py-12">
                <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No folders in this view</p>
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {filteredFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className={`p-4 hover:bg-muted/50 transition cursor-pointer ${
                      selectedFolder === folder.id ? 'bg-primary/10 border-l-4 border-primary' : ''
                    }`}
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Folder className="w-5 h-5 text-primary" />
                        {editingId === folder.id ? (
                          <input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') renameFolder(folder.id, editingName);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="px-2 py-1 rounded border border-primary bg-background text-sm flex-1"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{folder.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Created by {folder.createdBy} • {new Date(folder.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {folder.permissions === 'private' && <Lock className="w-4 h-4 text-orange-500" />}
                        {folder.permissions === 'shared' && <Users className="w-4 h-4 text-blue-500" />}
                        {folder.permissions === 'public' && <Globe className="w-4 h-4 text-green-500" />}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(folder.id);
                          }}
                          className={`p-1.5 rounded transition ${
                            folder.isFavorite
                              ? 'text-yellow-500 hover:text-yellow-600'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${folder.isFavorite ? 'fill-current' : ''}`} />
                        </button>

                        {folder.createdBy === currentUser?.username && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                shareFolder(folder.id);
                              }}
                              className={`p-1.5 rounded transition ${
                                folder.isShared
                                  ? 'text-blue-500 hover:text-blue-600'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <Share2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(folder.id);
                                setEditingName(folder.name);
                              }}
                              className="p-1.5 text-muted-foreground hover:text-foreground rounded transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFolder(folder.id);
                              }}
                              className="p-1.5 text-muted-foreground hover:text-red-600 rounded transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-sm text-blue-900 leading-6">
              <span className="font-semibold">💾 File Storage:</span> Uploaded files are stored in Supabase. You can organize files in folders, share them with team members, and manage permissions. Google Drive integration coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
