import Swal from 'sweetalert2';

// 🔔 Reusable confirmation alert
export const ConfirmAlert = async ({
  title = 'Are you sure?',
  text = 'Do you want to proceed?',
  confirmButtonText = 'Yes',
  cancelButtonText = 'Cancel',
  icon = 'warning',
}) => {
  return Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
  });
};

// ✅ Reusable success alert (auto-dismiss after 3s)
export const SuccessAlert = async ({
  title = 'Success!',
  text = 'Operation completed successfully.',
  confirmButtonText = 'OK',
  timer = 3000, // default 3 seconds
}) => {
  return Swal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonText,
    timer,
    timerProgressBar: true,
  });
};

export const ErrorAlert = async ({
  title = 'Error!',
  text = 'Something went wrong.',
  confirmButtonText = 'OK',
}) => {
  return Swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonText,
    buttonsStyling: false,
    customClass: {
      confirmButton: 'btn btn-danger px-4 py-2 rounded-pill',
    },
  });
};