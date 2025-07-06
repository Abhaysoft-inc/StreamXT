import { ToastContainer, toast, Bounce } from 'react-toastify';

export default async function showAddedSoonToast() {
        await toast('We are woking on this feature', {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "dark",
            transition: Bounce,
        });

    }