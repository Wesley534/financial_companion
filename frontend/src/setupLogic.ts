// frontend/src/setupLogic.ts

/**
 * Determines if the authenticated user has completed the initial setup wizard.
 * Checks the `is_setup_complete` field from the backend.
 *
 * @param user The authenticated user object from the store.
 * @returns boolean - true if setup is complete, false otherwise
 */

type UserWithSetupStatus = { 
    id: number;
    name: string;
    email: string;
    is_setup_complete?: boolean; // Backend field
    currency?: string;           // Optional additional fields
};

export const hasCompletedSetup = (user: UserWithSetupStatus | null | undefined): boolean => {
    // Safety: If no user, setup is not complete
    if (!user) return false;

    // Explicitly coerce to boolean (handles undefined)
    const isComplete = Boolean(user.is_setup_complete);

    // Debugging log
    console.log('[SetupLogic] User:', user.id, 'is_setup_complete:', user.is_setup_complete, '=>', isComplete);

    return isComplete;
};
