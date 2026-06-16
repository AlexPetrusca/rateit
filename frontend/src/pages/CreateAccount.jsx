import AccountSetupForm from '../components/AccountSetupForm.jsx';
import '../App.css';

const CreateAccount = () => {
    return (
        <div className="create-account-page">
            <AccountSetupForm className="create-account-card" />
        </div>
    );
};

export default CreateAccount;
