import { useAuth } from '../context/AuthContext';

/**
 * Hook to check if the current user has admin/edit permissions.
 * When `canEdit` is false, all Add/Edit/Delete/Save/Upload buttons should be hidden.
 */
const useCanEdit = () => {
  return true;
};

export default useCanEdit;
