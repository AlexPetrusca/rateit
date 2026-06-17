import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import AdminDataGrid from '../components/AdminDataGrid.jsx';
import AdminSelectionToolbar from '../components/AdminSelectionToolbar.jsx';
import Modal from '../components/Modal.jsx';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import BackendApiService from '../services/BackendApiService';
import { emptySelectionModel, getSelectedRowIds } from '../utils/adminSelection.js';

const DEFAULT_PAGE_SIZE = 10;
const ROLE_OPTIONS = ['ROLE_USER', 'ROLE_TEST_USER', 'ROLE_ADMIN'];

const AdminUsers = () => {
    const { user: currentUser } = useAuth();
    const { notify } = useNotifications();
    const [users, setUsers] = useState([]);
    const [rowCount, setRowCount] = useState(0);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: DEFAULT_PAGE_SIZE });
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [editDraft, setEditDraft] = useState({
        username: '',
        phoneNumber: '',
        profilePicUrl: '',
        role: 'ROLE_USER'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedUserSelectionModel, setSelectedUserSelectionModel] = useState(emptySelectionModel);
    const [isBulkDeleteUsersOpen, setIsBulkDeleteUsersOpen] = useState(false);
    const [isDeletingSelectedUsers, setIsDeletingSelectedUsers] = useState(false);
    const [isDeleteAllTestUsersOpen, setIsDeleteAllTestUsersOpen] = useState(false);
    const [isDeletingAllTestUsers, setIsDeletingAllTestUsers] = useState(false);

    const loadUsers = useCallback(async (nextPaginationModel = paginationModel) => {
        setIsLoading(true);
        setLoadError('');

        try {
            const page = await BackendApiService.getAdminUsers({
                page: nextPaginationModel.page,
                size: nextPaginationModel.pageSize
            });
            const nextRows = page.content || [];
            setUsers(nextRows);
            setRowCount(page.totalElements || 0);
            setSelectedUserSelectionModel(emptySelectionModel);

            if (nextPaginationModel.page > 0 && nextRows.length === 0 && (page.totalElements || 0) > 0) {
                setPaginationModel((current) => ({
                    ...current,
                    page: Math.max(0, current.page - 1)
                }));
            }
        } catch (error) {
            setLoadError(error.message || 'Failed to load users');
            notify({ message: error.message || 'Failed to load users', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [notify, paginationModel]);

    useEffect(() => {
        let isMounted = true;

        BackendApiService.getAdminUsers({
            page: paginationModel.page,
            size: paginationModel.pageSize
        })
            .then((page) => {
                if (!isMounted) {
                    return;
                }
                const nextRows = page.content || [];
                setUsers(nextRows);
                setRowCount(page.totalElements || 0);
                setLoadError('');
                setSelectedUserSelectionModel(emptySelectionModel);

                if (paginationModel.page > 0 && nextRows.length === 0 && (page.totalElements || 0) > 0) {
                    setPaginationModel((current) => ({
                        ...current,
                        page: Math.max(0, current.page - 1)
                    }));
                }
            })
            .catch((error) => {
                if (!isMounted) {
                    return;
                }
                setLoadError(error.message || 'Failed to load users');
                notify({ message: error.message || 'Failed to load users', type: 'error' });
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [paginationModel, notify]);

    const openEdit = (userRow) => {
        if (userRow.deletedAt) {
            notify({ message: 'Deleted users cannot be edited', type: 'warning' });
            return;
        }

        setEditingUser(userRow);
        setEditDraft({
            username: userRow.username || '',
            phoneNumber: userRow.phoneNumber || '',
            profilePicUrl: userRow.profilePicUrl || '',
            role: userRow.role || 'ROLE_USER'
        });
    };

    const closeEdit = () => {
        setEditingUser(null);
        setEditDraft({
            username: '',
            phoneNumber: '',
            profilePicUrl: '',
            role: 'ROLE_USER'
        });
    };

    const handleSave = async () => {
        if (!editingUser) {
            return;
        }

        if (!editDraft.username.trim() || !editDraft.phoneNumber.trim() || !editDraft.role.trim()) {
            notify({ message: 'Username, phone number, and role are required', type: 'warning' });
            return;
        }

        setIsSaving(true);
        try {
            const updatedUser = await BackendApiService.updateAdminUser(editingUser.userId, {
                username: editDraft.username.trim(),
                phoneNumber: editDraft.phoneNumber.trim(),
                profilePicUrl: editDraft.profilePicUrl.trim(),
                role: editDraft.role.trim()
            });

            notify({ message: `Updated ${updatedUser.username}`, type: 'info' });
            closeEdit();
            await loadUsers(paginationModel);
        } catch (error) {
            notify({ message: error.message || 'Failed to update user', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) {
            return;
        }

        setIsDeleting(true);
        try {
            await BackendApiService.deleteAdminUser(deleteTarget.userId);
            notify({ message: `Deleted ${deleteTarget.username}`, type: 'info' });
            setDeleteTarget(null);
            await loadUsers(paginationModel);
        } catch (error) {
            notify({ message: error.message || 'Failed to delete user', type: 'error' });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteAllTestUsers = async () => {
        setIsDeletingAllTestUsers(true);
        try {
            const result = await BackendApiService.deleteAllTestUsers();
            notify({
                message: result.deletedCount > 0
                    ? `Deleted ${result.deletedCount} test users`
                    : 'No test users found to delete',
                type: 'info'
            });
            setIsDeleteAllTestUsersOpen(false);
            await loadUsers(paginationModel);
        } catch (error) {
            notify({ message: error.message || 'Failed to delete test users', type: 'error' });
        } finally {
            setIsDeletingAllTestUsers(false);
        }
    };

    const selectedUsers = useMemo(
        () => getSelectedRowIds(selectedUserSelectionModel, users, (user) => user.userId)
            .map((userId) => users.find((user) => user.userId === userId))
            .filter(Boolean),
        [users, selectedUserSelectionModel]
    );

    const handleBulkDeleteSelectedUsers = async () => {
        if (selectedUsers.length === 0) {
            notify({ message: 'Select at least one user first', type: 'warning' });
            return;
        }

        setIsDeletingSelectedUsers(true);
        try {
            const result = await BackendApiService.bulkDeleteAdminUsers(selectedUsers.map((user) => user.userId));
            notify({
                message: result.deletedCount > 0
                    ? `Deleted ${result.deletedCount} users`
                    : 'No users were deleted',
                type: 'info'
            });
            setIsBulkDeleteUsersOpen(false);
            setSelectedUserSelectionModel(emptySelectionModel);
            await loadUsers(paginationModel);
        } catch (error) {
            notify({ message: error.message || 'Failed to delete selected users', type: 'error' });
        } finally {
            setIsDeletingSelectedUsers(false);
        }
    };

    const isCurrentAccount = (row) => currentUser?.userId != null && row.userId === currentUser.userId;

    const columns = useMemo(() => [
        {
            field: 'userId',
            headerName: 'ID',
            width: 96,
            align: 'center',
            headerAlign: 'center'
        },
        {
            field: 'username',
            headerName: 'Username',
            flex: 1,
            minWidth: 180,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="body2" fontWeight={700} sx={{ textAlign: 'center' }}>
                        {params.value}
                    </Typography>
                </Box>
            )
        },
        {
            field: 'phoneNumber',
            headerName: 'Phone',
            flex: 1,
            minWidth: 180,
            align: 'center',
            headerAlign: 'center'
        },
        {
            field: 'deletedAt',
            headerName: 'Status',
            width: 140,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Chip
                    label={params.value ? 'DELETED' : 'ACTIVE'}
                    color={params.value ? 'default' : 'success'}
                    size="small"
                    variant={params.value ? 'outlined' : 'filled'}
                />
            )
        },
        {
            field: 'profilePicUrl',
            headerName: 'Avatar Key',
            flex: 1,
            minWidth: 220,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => params.value || '—'
        },
        {
            field: 'role',
            headerName: 'Role',
            width: 150,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => (
                <Chip label={params.value} size="small" variant="outlined" />
            )
        },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 220,
            sortable: false,
            filterable: false,
            align: 'center',
            headerAlign: 'center',
            renderCell: (params) => {
                const row = params.row;
                const selfDelete = isCurrentAccount(row);
                const isDeleted = Boolean(row.deletedAt);

                return (
                    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Stack direction="row" spacing={1}>
                            <Button size="small" variant="outlined" disabled={isDeleted} onClick={(event) => {
                                event.stopPropagation();
                                openEdit(row);
                            }}>
                                Edit
                            </Button>
                            <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                disabled={selfDelete || isDeleted}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setDeleteTarget(row);
                                }}
                            >
                                Delete
                            </Button>
                        </Stack>
                    </Box>
                );
            }
        }
    ], [currentUser, loadUsers, notify, paginationModel]);

    return (
        <Stack spacing={3}>
            <Paper elevation={1} sx={{ p: 2.5 }}>
                <Stack spacing={1.5}>
                    <Box>
                        <Typography variant="h6" component="h2" gutterBottom>
                            User Management
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Browse, edit, and remove users.
                        </Typography>
                    </Box>

                    <Box>
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={() => setIsDeleteAllTestUsersOpen(true)}
                        >
                            Delete all test users
                        </Button>
                    </Box>

                    <AdminSelectionToolbar
                        count={selectedUsers.length}
                        itemName="user"
                        onAction={() => setIsBulkDeleteUsersOpen(true)}
                        onClear={() => setSelectedUserSelectionModel(emptySelectionModel)}
                    />

                    {loadError && <Alert severity="error">{loadError}</Alert>}

                    <AdminDataGrid
                        autoHeight
                        rows={users}
                        columns={columns}
                        getRowId={(row) => row.userId}
                        loading={isLoading}
                        paginationMode="server"
                        rowCount={rowCount}
                        paginationModel={paginationModel}
                        onPaginationModelChange={setPaginationModel}
                        pageSizeOptions={[10, 25, 50]}
                        checkboxSelection
                        rowSelectionModel={selectedUserSelectionModel}
                        onRowSelectionModelChange={(selectionModel) => {
                            setSelectedUserSelectionModel(selectionModel || emptySelectionModel);
                        }}
                        disableRowSelectionOnClick
                        isRowSelectable={(params) => !isCurrentAccount(params.row) && !params.row.deletedAt}
                        onRowClick={(params) => {
                            if (params.field === '__check__') {
                                return;
                            }

                            openEdit(params.row);
                        }}
                        getRowClassName={(params) => (params.row.deletedAt ? 'deleted-user' : '')}
                        sx={{
                            '& .MuiDataGrid-row.deleted-user': {
                                backgroundColor: '#fafafa',
                                color: '#8a8d91'
                            }
                        }}
                    />
                </Stack>
            </Paper>

            <Modal
                isOpen={editingUser != null}
                title={editingUser ? `Edit ${editingUser.username}` : 'Edit user'}
                onClose={closeEdit}
            >
                {editingUser && (
                    <Stack spacing={2}>
                        {isCurrentAccount(editingUser) && (
                            <Alert severity="info">
                                Your phone number is locked here so the current session stays valid.
                            </Alert>
                        )}
                        <TextField
                            label="Username"
                            value={editDraft.username}
                            onChange={(event) => setEditDraft((current) => ({
                                ...current,
                                username: event.target.value
                            }))}
                            fullWidth
                        />
                        <TextField
                            label="Phone Number"
                            value={editDraft.phoneNumber}
                            disabled={isCurrentAccount(editingUser)}
                            onChange={(event) => setEditDraft((current) => ({
                                ...current,
                                phoneNumber: event.target.value
                            }))}
                            fullWidth
                        />
                        <TextField
                            label="Profile Pic Url"
                            value={editDraft.profilePicUrl}
                            onChange={(event) => setEditDraft((current) => ({
                                ...current,
                                profilePicUrl: event.target.value
                            }))}
                            fullWidth
                        />
                        <FormControl fullWidth>
                            <InputLabel id="admin-user-role-label">Role</InputLabel>
                            <Select
                                labelId="admin-user-role-label"
                                label="Role"
                                value={editDraft.role}
                                onChange={(event) => setEditDraft((current) => ({
                                    ...current,
                                    role: event.target.value
                                }))}
                            >
                                {ROLE_OPTIONS.map((role) => (
                                    <MenuItem key={role} value={role}>
                                        {role}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                            <Button variant="outlined" onClick={closeEdit}>
                                Cancel
                            </Button>
                            <Button variant="contained" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save changes'}
                            </Button>
                        </Stack>
                    </Stack>
                )}
            </Modal>

            <Modal
                isOpen={deleteTarget != null}
                title={deleteTarget ? `Delete ${deleteTarget.username}` : 'Delete user'}
                onClose={() => setDeleteTarget(null)}
            >
                {deleteTarget && (
                    <Stack spacing={2}>
                        {isCurrentAccount(deleteTarget) ? (
                            <Alert severity="warning">
                                You cannot delete the currently logged-in admin account.
                            </Alert>
                        ) : (
                            <Typography variant="body1">
                                Delete <strong>{deleteTarget.username}</strong>? This cannot be undone.
                            </Typography>
                        )}

                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                            <Button variant="outlined" onClick={() => setDeleteTarget(null)}>
                                Cancel
                            </Button>
                            <Button
                                color="error"
                                variant="contained"
                                onClick={handleDelete}
                                disabled={isDeleting || isCurrentAccount(deleteTarget)}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete user'}
                            </Button>
                        </Stack>
                    </Stack>
                )}
            </Modal>

            <Modal
                isOpen={isBulkDeleteUsersOpen}
                title={`Delete ${selectedUsers.length} selected user${selectedUsers.length === 1 ? '' : 's'}`}
                onClose={() => setIsBulkDeleteUsersOpen(false)}
            >
                <Stack spacing={2}>
                    <Alert severity="warning">
                        This uses the same soft-delete / hard-delete policy as the single-user action.
                    </Alert>
                    <Typography variant="body1">
                        Delete {selectedUsers.length} selected user{selectedUsers.length === 1 ? '' : 's'}?
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                        <Button variant="outlined" onClick={() => setIsBulkDeleteUsersOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={handleBulkDeleteSelectedUsers}
                            disabled={isDeletingSelectedUsers}
                        >
                            {isDeletingSelectedUsers ? 'Deleting...' : 'Delete selected'}
                        </Button>
                    </Stack>
                </Stack>
            </Modal>

            <Modal
                isOpen={isDeleteAllTestUsersOpen}
                title="Delete all test users"
                onClose={() => setIsDeleteAllTestUsersOpen(false)}
            >
                <Stack spacing={2}>
                    <Alert severity="warning">
                        This affects every account with role ROLE_TEST_USER.
                    </Alert>
                    <Typography variant="body1">
                        If a test user has authored content, it will be soft-deleted. If not, it will be removed from the database.
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                        <Button variant="outlined" onClick={() => setIsDeleteAllTestUsersOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={handleDeleteAllTestUsers}
                            disabled={isDeletingAllTestUsers}
                        >
                            {isDeletingAllTestUsers ? 'Deleting...' : 'Delete all test users'}
                        </Button>
                    </Stack>
                </Stack>
            </Modal>
        </Stack>
    );
};

export default AdminUsers;
