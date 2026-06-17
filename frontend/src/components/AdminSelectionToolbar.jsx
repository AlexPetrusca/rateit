import { Button, Paper, Stack, Typography } from '@mui/material';

const AdminSelectionToolbar = ({
    count,
    itemName,
    actionLabel = 'Delete selected',
    onAction,
    onClear
}) => {
    if (!count) {
        return null;
    }

    return (
        <Paper variant="outlined" sx={{ p: 1.5, backgroundColor: '#f7f9f9' }}>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ justifyContent: 'space-between', alignItems: 'center' }}
            >
                <Typography variant="body2" color="text.secondary">
                    {count} {itemName}{count === 1 ? '' : 's'} selected
                </Typography>
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={onAction}
                    >
                        {actionLabel}
                    </Button>
                    <Button variant="text" onClick={onClear}>
                        Clear selection
                    </Button>
                </Stack>
            </Stack>
        </Paper>
    );
};

export default AdminSelectionToolbar;
