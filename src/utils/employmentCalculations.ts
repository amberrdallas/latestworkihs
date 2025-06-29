export interface EmploymentCalculation {
  daysWorked: number;
  shouldBePermanent: boolean;
  daysUntilPermanent: number;
  isEligibleForPermanent: boolean;
  calculationEndDate: string; // The date used for calculation end
  isCurrentlyEmployed: boolean; // Whether the person is still employed
  guaranteeAgency: 'philippine' | 'saudi'; // Which agency is responsible for guarantee
  guaranteeReason: string; // Explanation of why this agency is responsible
}

export const calculateEmploymentStatus = (
  startDate: string, 
  currentStatus: 'probationary' | 'permanent' | 'resigned' | 'terminated',
  effectiveDate?: string,
  endDate?: string
): EmploymentCalculation => {
  if (!startDate) {
    return {
      daysWorked: 0,
      shouldBePermanent: false,
      daysUntilPermanent: 90,
      isEligibleForPermanent: false,
      calculationEndDate: new Date().toISOString().split('T')[0],
      isCurrentlyEmployed: false,
      guaranteeAgency: 'philippine',
      guaranteeReason: 'No start date provided - default to Philippine Agency'
    };
  }

  const start = new Date(startDate);
  const today = new Date();
  let calculationEndDate: Date;
  let isCurrentlyEmployed: boolean;

  // Determine the end date for calculation based on status
  switch (currentStatus) {
    case 'probationary':
      // For probationary: 
      // - If there's an effective date, it means they didn't complete probationary period
      // - Count from start date to effective date
      // - If no effective date, they're still in probationary period, count to today
      if (effectiveDate) {
        calculationEndDate = new Date(effectiveDate);
        isCurrentlyEmployed = false;
      } else {
        calculationEndDate = today;
        isCurrentlyEmployed = true;
      }
      break;
      
    case 'resigned':
    case 'terminated':
      // For resigned/terminated: count from start date to effective date
      if (effectiveDate) {
        calculationEndDate = new Date(effectiveDate);
        isCurrentlyEmployed = false;
      } else {
        // If no effective date provided, use today as fallback
        calculationEndDate = today;
        isCurrentlyEmployed = false;
      }
      break;
      
    case 'permanent':
      // For permanent: count from start date to end date (or today if still employed)
      if (endDate) {
        const contractEnd = new Date(endDate);
        // If contract end date is in the future, they're still employed
        if (contractEnd > today) {
          calculationEndDate = today;
          isCurrentlyEmployed = true;
        } else {
          calculationEndDate = contractEnd;
          isCurrentlyEmployed = false;
        }
      } else {
        calculationEndDate = today;
        isCurrentlyEmployed = true;
      }
      break;
      
    default:
      calculationEndDate = today;
      isCurrentlyEmployed = true;
  }

  // Calculate days worked
  const diffTime = calculationEndDate.getTime() - start.getTime();
  const daysWorked = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Check if should be permanent (90 days or more) - only relevant for probationary
  const shouldBePermanent = currentStatus === 'probationary' && daysWorked >= 90;
  const daysUntilPermanent = currentStatus === 'probationary' ? Math.max(0, 90 - daysWorked) : 0;
  const isEligibleForPermanent = currentStatus === 'probationary' && daysWorked >= 90;

  // Determine guarantee agency based on days worked
  let guaranteeAgency: 'philippine' | 'saudi';
  let guaranteeReason: string;

  if (daysWorked < 90) {
    guaranteeAgency = 'philippine';
    guaranteeReason = `Under 90 days (${daysWorked} days) - Philippine Agency responsible for guarantee`;
  } else {
    guaranteeAgency = 'saudi';
    guaranteeReason = `Over 90 days (${daysWorked} days) - Saudi Agency responsible for guarantee`;
  }

  // Special case for permanent employees - they've definitely passed 90 days
  if (currentStatus === 'permanent') {
    guaranteeAgency = 'saudi';
    guaranteeReason = `Permanent employee (${daysWorked} days) - Saudi Agency responsible for guarantee`;
  }

  return {
    daysWorked: Math.max(0, daysWorked), // Don't show negative days
    shouldBePermanent,
    daysUntilPermanent,
    isEligibleForPermanent,
    calculationEndDate: calculationEndDate.toISOString().split('T')[0],
    isCurrentlyEmployed,
    guaranteeAgency,
    guaranteeReason
  };
};

export const getEmploymentStatusColor = (status: 'probationary' | 'permanent' | 'resigned' | 'terminated', daysWorked: number) => {
  if (status === 'permanent') {
    return 'bg-green-100 text-green-800 border-green-200';
  }
  
  if (status === 'resigned') {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  }
  
  if (status === 'terminated') {
    return 'bg-red-100 text-red-800 border-red-200';
  }
  
  if (daysWorked >= 90) {
    return 'bg-blue-100 text-blue-800 border-blue-200'; // Ready for permanent
  }
  
  if (daysWorked >= 60) {
    return 'bg-yellow-100 text-yellow-800 border-yellow-200'; // Close to permanent
  }
  
  return 'bg-orange-100 text-orange-800 border-orange-200'; // Still probationary
};

export const getEmploymentStatusText = (status: 'probationary' | 'permanent' | 'resigned' | 'terminated', daysWorked: number) => {
  if (status === 'permanent') {
    return 'Permanent Employee';
  }
  
  if (status === 'resigned') {
    return 'Resigned';
  }
  
  if (status === 'terminated') {
    return 'Terminated';
  }
  
  if (daysWorked >= 90) {
    return 'Eligible for Permanent';
  }
  
  return 'Probationary Period';
};

export const getGuaranteeAgencyColor = (agency: 'philippine' | 'saudi') => {
  return agency === 'philippine' 
    ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
    : 'bg-green-100 text-green-800 border-green-200';
};

export const getGuaranteeAgencyText = (agency: 'philippine' | 'saudi') => {
  return agency === 'philippine' ? 'Philippine Agency Guarantee' : 'Saudi Agency Guarantee';
};

export const formatDaysWorked = (days: number): string => {
  if (days === 0) return '0 days';
  if (days === 1) return '1 day';
  
  if (days >= 365) {
    const years = Math.floor(days / 365);
    const remainingDays = days % 365;
    if (remainingDays === 0) {
      return `${years} ${years === 1 ? 'year' : 'years'}`;
    }
    return `${years} ${years === 1 ? 'year' : 'years'}, ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}`;
  }
  
  if (days >= 30) {
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    if (remainingDays === 0) {
      return `${months} ${months === 1 ? 'month' : 'months'}`;
    }
    return `${months} ${months === 1 ? 'month' : 'months'}, ${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}`;
  }
  
  return `${days} days`;
};

// Helper function to get a descriptive text about the calculation period
export const getCalculationPeriodText = (
  status: 'probationary' | 'permanent' | 'resigned' | 'terminated',
  startDate: string,
  calculationEndDate: string,
  isCurrentlyEmployed: boolean,
  effectiveDate?: string
): string => {
  const start = new Date(startDate).toLocaleDateString();
  const end = new Date(calculationEndDate).toLocaleDateString();
  
  switch (status) {
    case 'probationary':
      if (effectiveDate) {
        const effectiveDateFormatted = new Date(effectiveDate).toLocaleDateString();
        return `From ${start} to ${effectiveDateFormatted} (probationary period ended)`;
      } else {
        return isCurrentlyEmployed 
          ? `From ${start} to present (still in probationary period)`
          : `From ${start} to ${end}`;
      }
        
    case 'permanent':
      return isCurrentlyEmployed 
        ? `From ${start} to present (permanent employee)`
        : `From ${start} to ${end} (contract ended)`;
        
    case 'resigned':
      const resignationDate = effectiveDate ? new Date(effectiveDate).toLocaleDateString() : end;
      return `From ${start} to ${resignationDate} (resignation date)`;
      
    case 'terminated':
      const terminationDate = effectiveDate ? new Date(effectiveDate).toLocaleDateString() : end;
      return `From ${start} to ${terminationDate} (termination date)`;
      
    default:
      return `From ${start} to ${end}`;
  }
};