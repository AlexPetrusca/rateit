import { Box } from '@mui/material';
import { DataGrid as MUIDataGrid } from '@mui/x-data-grid';

const AdminDataGrid = ({ sx, ...props }) => {
    return (
        <Box
            sx={{
                width: '100%',
                '& .MuiDataGrid-root': {
                    border: 'none'
                },
                '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: '#f7f9f9'
                },
                '& .MuiDataGrid-cell': {
                    display: 'flex',
                    alignItems: 'center'
                },
                '& .MuiDataGrid-columnHeader': {
                    display: 'flex',
                    alignItems: 'center'
                },
                '& .MuiDataGrid-cellContent': {
                    display: 'flex',
                    alignItems: 'center'
                },
                '& .MuiDataGrid-columnHeaderTitleContainer': {
                    display: 'flex',
                    alignItems: 'center'
                },
                '& .MuiDataGrid-columnHeaderTitleContainerContent': {
                    display: 'flex',
                    alignItems: 'center'
                },
                ...sx
            }}
        >
            <MUIDataGrid {...props} />
        </Box>
    );
};

export default AdminDataGrid;
