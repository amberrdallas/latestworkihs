import React, { useState, useEffect } from 'react';
import { Housemaid } from '../types/housemaid';
import { countries, passportCountries } from '../data/countries';
import { generateHousemaidNumber, shouldGenerateHousemaidNumber } from '../utils/localStorage';
import { calculateEmploymentStatus, formatDaysWorked, getEmploymentStatusColor, getEmploymentStatusText, getGuaranteeAgencyColor, getGuaranteeAgencyText, getCalculationPeriodText } from '../utils/employmentCalculations';
import { hasPermission, getCurrentUser } from '../utils/auth';
import CountrySelect from './CountrySelect';
import CVUpload from './CVUpload';
import CVViewer from './CVViewer';
import ProfilePhotoUpload from './ProfilePhotoUpload';
import ProfilePhotoViewer from './ProfilePhotoViewer';
import POLOClearanceUpload from './POLOClearanceUpload';
import POLOClearanceViewer from './POLOClearanceViewer';
import AirTicketUpload from './AirTicketUpload';
import AirTicketViewer from './AirTicketViewer';
import { 
  Save, 
  X, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Building, 
  Calendar, 
  Briefcase, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  Plane,
  Hash,
  Info,
  Camera,
  Ticket,
  Award,
  Users
} from 'lucide-react';

interface HousemaidFormProps {
  housemaid?: Housemaid;
  onSave: (housemaid: Housemaid) => void;
  onCancel: () => void;
}

const HousemaidForm: React.FC<HousemaidFormProps> = ({ housemaid, onSave, onCancel }) => {
  const currentUser = getCurrentUser();
  const isReadOnly = !hasPermission(currentUser?.role || 'viewer', 'manager');

  const [formData, setFormData] = useState<Housemaid>({
    id: housemaid?.id || '',
    housemaidNumber: housemaid?.housemaidNumber || '',
    personalInfo: {
      name: housemaid?.personalInfo.name || '',
      email: housemaid?.personalInfo.email || '',
      citizenship: housemaid?.personalInfo.citizenship || '',
      phone: housemaid?.personalInfo.phone || '',
      countryOfResidence: housemaid?.personalInfo.countryOfResidence || '',
      city: housemaid?.personalInfo.city || '',
      address: housemaid?.personalInfo.address || ''
    },
    profilePhoto: {
      fileName: housemaid?.profilePhoto?.fileName,
      fileData: housemaid?.profilePhoto?.fileData,
      fileType: housemaid?.profilePhoto?.fileType,
      uploadDate: housemaid?.profilePhoto?.uploadDate
    },
    identity: {
      passportNumber: housemaid?.identity.passportNumber || '',
      passportCountry: housemaid?.identity.passportCountry || '',
      residentId: housemaid?.identity.residentId || ''
    },
    locationStatus: {
      isInsideCountry: housemaid?.locationStatus.isInsideCountry ?? true,
      exitDate: housemaid?.locationStatus.exitDate || '',
      exitedTheCountryDate: housemaid?.locationStatus.exitedTheCountryDate || housemaid?.locationStatus.outsideCountryDate || '',
      outsideCountryDate: housemaid?.locationStatus.outsideCountryDate || ''
    },
    flightInfo: {
      flightDate: housemaid?.flightInfo?.flightDate || '',
      flightNumber: housemaid?.flightInfo?.flightNumber || '',
      airlineName: housemaid?.flightInfo?.airlineName || '',
      destination: housemaid?.flightInfo?.destination || ''
    },
    airTicket: {
      fileName: housemaid?.airTicket?.fileName,
      fileData: housemaid?.airTicket?.fileData,
      fileType: housemaid?.airTicket?.fileType,
      uploadDate: housemaid?.airTicket?.uploadDate,
      ticketNumber: housemaid?.airTicket?.ticketNumber || '',
      bookingReference: housemaid?.airTicket?.bookingReference || ''
    },
    employer: {
      name: housemaid?.employer.name || '',
      mobileNumber: housemaid?.employer.mobileNumber || ''
    },
    employment: {
      contractPeriodYears: housemaid?.employment?.contractPeriodYears || 2,
      startDate: housemaid?.employment?.startDate || '',
      endDate: housemaid?.employment?.endDate || '',
      status: housemaid?.employment?.status || 'probationary',
      position: housemaid?.employment?.position || '',
      salary: housemaid?.employment?.salary || '',
      effectiveDate: housemaid?.employment?.effectiveDate || ''
    },
    recruitmentAgency: {
      name: housemaid?.recruitmentAgency?.name || '',
      licenseNumber: housemaid?.recruitmentAgency?.licenseNumber || '',
      contactPerson: housemaid?.recruitmentAgency?.contactPerson || '',
      phoneNumber: housemaid?.recruitmentAgency?.phoneNumber || '',
      email: housemaid?.recruitmentAgency?.email || '',
      address: housemaid?.recruitmentAgency?.address || ''
    },
    saudiRecruitmentAgency: {
      name: housemaid?.saudiRecruitmentAgency?.name || '',
      licenseNumber: housemaid?.saudiRecruitmentAgency?.licenseNumber || '',
      contactPerson: housemaid?.saudiRecruitmentAgency?.contactPerson || '',
      phoneNumber: housemaid?.saudiRecruitmentAgency?.phoneNumber || '',
      email: housemaid?.saudiRecruitmentAgency?.email || '',
      address: housemaid?.saudiRecruitmentAgency?.address || ''
    },
    complaint: {
      description: housemaid?.complaint.description || '',
      status: housemaid?.complaint.status || 'pending',
      dateReported: housemaid?.complaint.dateReported || new Date().toISOString().split('T')[0],
      dateResolved: housemaid?.complaint.dateResolved || '',
      resolutionDescription: housemaid?.complaint.resolutionDescription || ''
    },
    cv: {
      fileName: housemaid?.cv?.fileName,
      fileData: housemaid?.cv?.fileData,
      fileType: housemaid?.cv?.fileType,
      uploadDate: housemaid?.cv?.uploadDate
    },
    poloClearance: {
      fileName: housemaid?.poloClearance?.fileName,
      fileData: housemaid?.poloClearance?.fileData,
      fileType: housemaid?.poloClearance?.fileType,
      uploadDate: housemaid?.poloClearance?.uploadDate,
      completionDate: housemaid?.poloClearance?.completionDate || ''
    },
    createdAt: housemaid?.createdAt || '',
    updatedAt: housemaid?.updatedAt || ''
  });

  const [showCVViewer, setShowCVViewer] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [showPOLOViewer, setShowPOLOViewer] = useState(false);
  const [showAirTicketViewer, setShowAirTicketViewer] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  // Auto-generate housemaid number when name changes (for new records only)
  useEffect(() => {
    if (!housemaid && shouldGenerateHousemaidNumber(formData.personalInfo.name, formData.housemaidNumber)) {
      setFormData(prev => ({
        ...prev,
        housemaidNumber: generateHousemaidNumber()
      }));
    }
  }, [formData.personalInfo.name, housemaid]);

  // Auto-calculate contract end date when start date or period changes
  useEffect(() => {
    if (formData.employment.startDate && formData.employment.contractPeriodYears) {
      const startDate = new Date(formData.employment.startDate);
      const endDate = new Date(startDate);
      endDate.setFullYear(startDate.getFullYear() + formData.employment.contractPeriodYears);
      
      setFormData(prev => ({
        ...prev,
        employment: {
          ...prev.employment,
          endDate: endDate.toISOString().split('T')[0]
        }
      }));
    }
  }, [formData.employment.startDate, formData.employment.contractPeriodYears]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isReadOnly) {
      onCancel();
      return;
    }

    const now = new Date().toISOString();
    const housemaidData: Housemaid = {
      ...formData,
      id: formData.id || `housemaid-${Date.now()}`,
      createdAt: formData.createdAt || now,
      updatedAt: now
    };

    onSave(housemaidData);
  };

  const handleInputChange = (section: keyof Housemaid, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleCVUpload = (cvData: { fileName: string; fileData: string; fileType: string; uploadDate: string }) => {
    setFormData(prev => ({
      ...prev,
      cv: cvData
    }));
  };

  const handleCVRemove = () => {
    setFormData(prev => ({
      ...prev,
      cv: {
        fileName: undefined,
        fileData: undefined,
        fileType: undefined,
        uploadDate: undefined
      }
    }));
  };

  const handlePhotoUpload = (photoData: { fileName: string; fileData: string; fileType: string; uploadDate: string }) => {
    setFormData(prev => ({
      ...prev,
      profilePhoto: photoData
    }));
  };

  const handlePhotoRemove = () => {
    setFormData(prev => ({
      ...prev,
      profilePhoto: {
        fileName: undefined,
        fileData: undefined,
        fileType: undefined,
        uploadDate: undefined
      }
    }));
  };

  const handlePOLOUpload = (clearanceData: { fileName: string; fileData: string; fileType: string; uploadDate: string }) => {
    setFormData(prev => ({
      ...prev,
      poloClearance: {
        ...prev.poloClearance,
        ...clearanceData
      }
    }));
  };

  const handlePOLORemove = () => {
    setFormData(prev => ({
      ...prev,
      poloClearance: {
        fileName: undefined,
        fileData: undefined,
        fileType: undefined,
        uploadDate: undefined,
        completionDate: prev.poloClearance.completionDate
      }
    }));
  };

  const handleAirTicketUpload = (ticketData: { fileName: string; fileData: string; fileType: string; uploadDate: string }) => {
    setFormData(prev => ({
      ...prev,
      airTicket: {
        ...prev.airTicket,
        ...ticketData
      }
    }));
  };

  const handleAirTicketRemove = () => {
    setFormData(prev => ({
      ...prev,
      airTicket: {
        fileName: undefined,
        fileData: undefined,
        fileType: undefined,
        uploadDate: undefined,
        ticketNumber: prev.airTicket.ticketNumber,
        bookingReference: prev.airTicket.bookingReference
      }
    }));
  };

  // Calculate employment status for display
  const employmentCalc = formData.employment.startDate 
    ? calculateEmploymentStatus(
        formData.employment.startDate, 
        formData.employment.status,
        formData.employment.effectiveDate,
        formData.employment.endDate
      )
    : null;

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: <User className="h-4 w-4" /> },
    { id: 'identity', label: 'Identity', icon: <FileText className="h-4 w-4" /> },
    { id: 'location', label: 'Location', icon: <MapPin className="h-4 w-4" /> },
    { id: 'employment', label: 'Employment', icon: <Briefcase className="h-4 w-4" /> },
    { id: 'agencies', label: 'Agencies', icon: <Building className="h-4 w-4" /> },
    { id: 'flight', label: 'Flight Info', icon: <Plane className="h-4 w-4" /> },
    { id: 'complaint', label: 'Complaint', icon: <AlertTriangle className="h-4 w-4" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {housemaid ? (isReadOnly ? 'View Record' : 'Edit Record') : 'Add New Record'}
            </h1>
            <p className="text-blue-100">
              {housemaid ? `Managing record for ${formData.personalInfo.name}` : 'Create a new housemaid record'}
            </p>
            {formData.housemaidNumber && (
              <div className="flex items-center mt-3">
                <Hash className="h-5 w-5 mr-2" />
                <span className="text-lg font-semibold">{formData.housemaidNumber}</span>
              </div>
            )}
          </div>
          
          {/* Employment Status Display */}
          {employmentCalc && formData.employment.startDate && (
            <div className="text-right">
              <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-sm text-blue-100 mb-1">Employment Status</div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border bg-white ${getEmploymentStatusColor(formData.employment.status, employmentCalc.daysWorked).replace('bg-', 'text-').replace('text-', 'text-').replace('border-', 'border-')}`}>
                  {getEmploymentStatusText(formData.employment.status, employmentCalc.daysWorked)}
                </div>
                <div className="text-sm text-blue-100 mt-2">
                  {formatDaysWorked(employmentCalc.daysWorked)} worked
                </div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border bg-white mt-2 ${getGuaranteeAgencyColor(employmentCalc.guaranteeAgency).replace('bg-', 'text-').replace('text-', 'text-').replace('border-', 'border-')}`}>
                  {getGuaranteeAgencyText(employmentCalc.guaranteeAgency)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Personal Information Tab */}
            {activeTab === 'personal' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Personal Information</h3>
                    <p className="text-gray-600">Basic personal details and contact information</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.personalInfo.name}
                      onChange={(e) => handleInputChange('personalInfo', 'name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={isReadOnly}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.personalInfo.email}
                      onChange={(e) => handleInputChange('personalInfo', 'email', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isReadOnly}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Citizenship <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.personalInfo.citizenship}
                      onChange={(e) => handleInputChange('personalInfo', 'citizenship', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={isReadOnly}
                    >
                      <option value="">Select Citizenship</option>
                      {passportCountries.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.personalInfo.phone}
                      onChange={(e) => handleInputChange('personalInfo', 'phone', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+971 50 123 4567"
                      required
                      disabled={isReadOnly}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country of Residence <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.personalInfo.countryOfResidence}
                      onChange={(e) => handleInputChange('personalInfo', 'countryOfResidence', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={isReadOnly}
                    >
                      <option value="">Select Country of Residence</option>
                      {passportCountries.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.personalInfo.city}
                      onChange={(e) => handleInputChange('personalInfo', 'city', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={isReadOnly}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.personalInfo.address}
                    onChange={(e) => handleInputChange('personalInfo', 'address', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            )}

            {/* Identity Tab */}
            {activeTab === 'identity' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Identity Information</h3>
                    <p className="text-gray-600">Passport and identification details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Passport Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.identity.passportNumber}
                      onChange={(e) => handleInputChange('identity', 'passportNumber', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={isReadOnly}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Passport Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.identity.passportCountry}
                      onChange={(e) => handleInputChange('identity', 'passportCountry', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={isReadOnly}
                    >
                      <option value="">Select Passport Country</option>
                      {passportCountries.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resident ID
                    </label>
                    <input
                      type="text"
                      value={formData.identity.residentId}
                      onChange={(e) => handleInputChange('identity', 'residentId', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Location Status Tab */}
            {activeTab === 'location' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MapPin className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Location Status</h3>
                    <p className="text-gray-600">Current location and travel information</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Location Status
                    </label>
                    <select
                      value={formData.locationStatus.isInsideCountry ? 'inside' : 'outside'}
                      onChange={(e) => handleInputChange('locationStatus', 'isInsideCountry', e.target.value === 'inside')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isReadOnly}
                    >
                      <option value="inside">Inside Country</option>
                      <option value="outside">Exited The Country</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exit Date
                    </label>
                    <input
                      type="date"
                      value={formData.locationStatus.exitDate}
                      onChange={(e) => handleInputChange('locationStatus', 'exitDate', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isReadOnly}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exited The Country Date
                    </label>
                    <input
                      type="date"
                      value={formData.locationStatus.exitedTheCountryDate}
                      onChange={(e) => handleInputChange('locationStatus', 'exitedTheCountryDate', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isReadOnly}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Date when they exited the country
                    </p>
                  </div>

                  {/* Legacy field - show but discourage use */}
                  {formData.locationStatus.outsideCountryDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Outside Country Date (Legacy)
                      </label>
                      <input
                        type="date"
                        value={formData.locationStatus.outsideCountryDate}
                        onChange={(e) => handleInputChange('locationStatus', 'outsideCountryDate', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                        disabled={isReadOnly}
                      />
                      <p className="text-xs text-orange-600 mt-1">
                        ⚠️ Legacy field - Please use "Exited The Country Date" instead
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Employment Tab */}
            {activeTab === 'employment' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Briefcase className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Employment Information</h3>
                    <p className="text-gray-600">Contract details and employment status</p>
                  </div>
                </div>

                {/* Employment Status Calculation Display */}
                {employmentCalc && formData.employment.startDate && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-2 mb-3">
                      <Info className="h-5 w-5 text-blue-600" />
                      <h4 className="font-medium text-blue-900">Employment Status Calculation</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700 font-medium">Days Worked:</span>
                        <div className="text-blue-900 font-semibold">{formatDaysWorked(employmentCalc.daysWorked)}</div>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Status:</span>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border mt-1 ${getEmploymentStatusColor(formData.employment.status, employmentCalc.daysWorked)}`}>
                          {getEmploymentStatusText(formData.employment.status, employmentCalc.daysWorked)}
                        </div>
                      </div>
                      <div>
                        <span className="text-blue-700 font-medium">Guarantee Agency:</span>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border mt-1 ${getGuaranteeAgencyColor(employmentCalc.guaranteeAgency)}`}>
                          {getGuaranteeAgencyText(employmentCalc.guaranteeAgency)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-blue-700">
                      <strong>Calculation Period:</strong> {getCalculationPeriodText(
                        formData.employment.status,
                        formData.employment.startDate,
                        employmentCalc.calculationEndDate,
                        employmentCalc.isCurrentlyEmployed,
                        formData.employment.effectiveDate
                      )}
                    </div>
                    <div className="mt-2 text-xs text-blue-600">
                      {employmentCalc.guaranteeReason}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.employer.name}
                      onChange={(e) => handleInputChange('employer', 'name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={isReadOnly}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employer Mobile <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.employer.mobileNumber}
                      onChange={(e) => handleInputChange('employer', 'mobileNumber', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={isReadOnly}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contract Period (Years)
                    </label>
                    <select
                      value={formData.employment.contractPeriodYears}
                      onChange={(e) => handleInputChange('employment', 'contractPeriodYears', parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isReadOnly}
                    >
                      <option value={1}>1 Year</option>
                      <option value={2}>2 Years</option>
                      <option value={3}>3 Years</option>
                      <option value={4}>4 Years</option>
                      <option value={5}>5 Years</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employment Status
                    </label>
                    <select
                      value={formData.employment.status}
                      onChange={(e) => handleInputChange('employment', 'status', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isReadOnly}
                    >
                      <option value="probationary">Probationary</option>
                      <option value="permanent">Permanent</option>
                      <option value="resigned">Resigned</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.employment.startDate}
                      onChange={(e) => handleInputChange('employment', 'startDate', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={isReadOnly}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.employment.endDate}
                      onChange={(e) => handleInputChange('employment', 'endDate', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                      disabled={true}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Automatically calculated based on start date and contract period
                    </p>
                  </div>

                  {(formData.employment.status === 'resigned' || formData.employment.status === 'terminated') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Effective Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.employment.effectiveDate}
                        onChange={(e) => handleInputChange('employment', 'effectiveDate', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                        disabled={isReadOnly}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Date when {formData.employment.status === 'resigned' ? 'resignation' : 'termination'} became effective
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Position
                    </label>
                    <input
                      type="text"
                      value={formData.employment.position}
                      onChange={(e) => handleInputChange('employment', 'position', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Housemaid, Nanny, Cook"
                      disabled={isReadOnly}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Salary
                    </label>
                    <input
                      type="text"
                      value={formData.employment.salary}
                      onChange={(e) => handleInputChange('employment', 'salary', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., AED 1,500"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Agencies Tab */}
            {activeTab === 'agencies' && (
              <div className="space-y-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Building className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Recruitment Agencies</h3>
                    <p className="text-gray-600">Philippine and Saudi recruitment agency information</p>
                  </div>
                </div>

                {/* Philippine Recruitment Agency */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Users className="h-5 w-5 text-yellow-600" />
                    <h4 className="text-lg font-semibold text-yellow-900">Philippine Recruitment Agency</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Agency Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.recruitmentAgency.name}
                        onChange={(e) => handleInputChange('recruitmentAgency', 'name', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        required
                        disabled={isReadOnly}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        License Number
                      </label>
                      <input
                        type="text"
                        value={formData.recruitmentAgency.licenseNumber}
                        onChange={(e) => handleInputChange('recruitmentAgency', 'licenseNumber', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        disabled={isReadOnly}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        value={formData.recruitmentAgency.contactPerson}
                        onChange={(e) => handleInputChange('recruitmentAgency', 'contactPerson', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        disabled={isReadOnly}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formData.recruitmentAgency.phoneNumber}
                        onChange={(e) => handleInputChange('recruitmentAgency', 'phoneNumber', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        disabled={isReadOnly}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.recruitmentAgency.email}
                        onChange={(e) => handleInputChange('recruitmentAgency', 'email', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        disabled={isReadOnly}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <textarea
                        value={formData.recruitmentAgency.address}
                        onChange={(e) => handleInputChange('recruitmentAgency', 'address', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                </div>

                {/* Saudi Recruitment Agency */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Building className="h-5 w-5 text-green-600" />
                    <h4 className="text-lg font-semibold text-green-900">Saudi Recruitment Agency</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Agency Name
                      </label>
                      <input
                        type="text"
                        value={formData.saudiRecruitmentAgency.name}
                        onChange={(e) => handleInputChange('saudiRecruitmentAgency', 'name', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        disabled={isReadOnly}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        License Number
                      </label>
                      <input
                        type="text"
                        value={formData.saudiRecruitmentAgency.licenseNumber}
                        onChange={(e) => handleInputChange('saudiRecruitmentAgency', 'licenseNumber', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        disabled={isReadOnly}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        value={formData.saudiRecruitmentAgency.contactPerson}
                        onChange={(e) => handleInputChange('saudiRecruitmentAgency', 'contactPerson', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        disabled={isReadOnly}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formData.saudiRecruitmentAgency.phoneNumber}
                        onChange={(e) => handleInputChange('saudiRecruitmentAgency', 'phoneNumber', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        disabled={isReadOnly}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.saudiRecruitmentAgency.email}
                        onChange={(e) => handleInputChange('saudiRecruitmentAgency', 'email', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        disabled={isReadOnly}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <textarea
                        value={formData.saudiRecruitmentAgency.address}
                        onChange={(e) => handleInputChange('saudiRecruitmentAgency', 'address', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Flight Information Tab */}
            {activeTab === 'flight' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Plane className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Flight Information</h3>
                    <p className="text-gray-600">Travel details and flight information</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Flight Date
                    </label>
                    <input
                      type="date"
                      value={formData.flightInfo.flightDate}
                      onChange={(e) => handleInputChange('flightInfo', 'flightDate', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isReadOnly}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Flight Number
                    </label>
                    <input
                      type="text"
                      value={formData.flightInfo.flightNumber}
                      onChange={(e) => handleInputChange('flightInfo', 'flightNumber', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., EK123"
                      disabled={isReadOnly}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Airline Name
                    </label>
                    <input
                      type="text"
                      value={formData.flightInfo.airlineName}
                      onChange={(e) => handleInputChange('flightInfo', 'airlineName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Emirates"
                      disabled={isReadOnly}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destination
                    </label>
                    <input
                      type="text"
                      value={formData.flightInfo.destination}
                      onChange={(e) => handleInputChange('flightInfo', 'destination', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Dubai, Manila"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Complaint Tab */}
            {activeTab === 'complaint' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Complaint Information</h3>
                    <p className="text-gray-600">Complaint details and resolution status</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Complaint Status
                    </label>
                    <select
                      value={formData.complaint.status}
                      onChange={(e) => handleInputChange('complaint', 'status', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isReadOnly}
                    >
                      <option value="pending">Pending</option>
                      <option value="complete">Complete</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Reported
                    </label>
                    <input
                      type="date"
                      value={formData.complaint.dateReported}
                      onChange={(e) => handleInputChange('complaint', 'dateReported', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isReadOnly}
                    />
                  </div>

                  {formData.complaint.status === 'complete' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date Resolved
                      </label>
                      <input
                        type="date"
                        value={formData.complaint.dateResolved}
                        onChange={(e) => handleInputChange('complaint', 'dateResolved', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={isReadOnly}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Complaint Description
                  </label>
                  <textarea
                    value={formData.complaint.description}
                    onChange={(e) => handleInputChange('complaint', 'description', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe the complaint or issue..."
                    disabled={isReadOnly}
                  />
                </div>

                {formData.complaint.status === 'complete' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resolution Description
                    </label>
                    <textarea
                      value={formData.complaint.resolutionDescription}
                      onChange={(e) => handleInputChange('complaint', 'resolutionDescription', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe how the complaint was resolved..."
                      disabled={isReadOnly}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Documents</h3>
                    <p className="text-gray-600">Upload and manage important documents</p>
                  </div>
                </div>

                {/* Profile Photo */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Camera className="h-5 w-5 mr-2 text-blue-600" />
                    Profile Photo
                  </h4>
                  {!isReadOnly ? (
                    <ProfilePhotoUpload
                      photo={formData.profilePhoto}
                      onUpload={handlePhotoUpload}
                      onRemove={handlePhotoRemove}
                      onView={() => setShowPhotoViewer(true)}
                    />
                  ) : (
                    formData.profilePhoto.fileData && (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                        <div className="flex items-center space-x-4">
                          <img
                            src={formData.profilePhoto.fileData}
                            alt="Profile"
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{formData.profilePhoto.fileName}</p>
                            <button
                              type="button"
                              onClick={() => setShowPhotoViewer(true)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              View Photo
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* CV Upload */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-600" />
                    Curriculum Vitae (CV)
                  </h4>
                  {!isReadOnly ? (
                    <CVUpload
                      cv={formData.cv}
                      onUpload={handleCVUpload}
                      onRemove={handleCVRemove}
                      onView={() => setShowCVViewer(true)}
                    />
                  ) : (
                    formData.cv.fileData && (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{formData.cv.fileName}</p>
                            <button
                              type="button"
                              onClick={() => setShowCVViewer(true)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              View CV
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* POLO Clearance */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-green-600" />
                    POLO Clearance
                  </h4>
                  {!isReadOnly ? (
                    <POLOClearanceUpload
                      clearance={formData.poloClearance}
                      onUpload={handlePOLOUpload}
                      onRemove={handlePOLORemove}
                      onView={() => setShowPOLOViewer(true)}
                      completionDate={formData.poloClearance.completionDate}
                      onCompletionDateChange={(date) => handleInputChange('poloClearance', 'completionDate', date)}
                    />
                  ) : (
                    formData.poloClearance.fileData && (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{formData.poloClearance.fileName}</p>
                            {formData.poloClearance.completionDate && (
                              <p className="text-sm text-green-600">
                                Completed: {new Date(formData.poloClearance.completionDate).toLocaleDateString()}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => setShowPOLOViewer(true)}
                              className="text-green-600 hover:text-green-800 text-sm"
                            >
                              View POLO Clearance
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Air Ticket */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Ticket className="h-5 w-5 mr-2 text-purple-600" />
                    Air Ticket
                  </h4>
                  {!isReadOnly ? (
                    <AirTicketUpload
                      airTicket={formData.airTicket}
                      onUpload={handleAirTicketUpload}
                      onRemove={handleAirTicketRemove}
                      onView={() => setShowAirTicketViewer(true)}
                      ticketNumber={formData.airTicket.ticketNumber}
                      bookingReference={formData.airTicket.bookingReference}
                      onTicketNumberChange={(ticketNumber) => handleInputChange('airTicket', 'ticketNumber', ticketNumber)}
                      onBookingReferenceChange={(bookingReference) => handleInputChange('airTicket', 'bookingReference', bookingReference)}
                    />
                  ) : (
                    formData.airTicket.fileData && (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{formData.airTicket.fileName}</p>
                            {formData.airTicket.ticketNumber && (
                              <p className="text-sm text-purple-600">
                                Ticket: {formData.airTicket.ticketNumber}
                              </p>
                            )}
                            {formData.airTicket.bookingReference && (
                              <p className="text-sm text-purple-600">
                                Ref: {formData.airTicket.bookingReference}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => setShowAirTicketViewer(true)}
                              className="text-purple-600 hover:text-purple-800 text-sm"
                            >
                              View Air Ticket
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center space-x-2"
          >
            <X className="h-5 w-5" />
            <span>{isReadOnly ? 'Close' : 'Cancel'}</span>
          </button>
          
          {!isReadOnly && (
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium flex items-center space-x-2 shadow-sm hover:shadow-md"
            >
              <Save className="h-5 w-5" />
              <span>{housemaid ? 'Update Record' : 'Save Record'}</span>
            </button>
          )}
        </div>
      </form>

      {/* Document Viewers */}
      {showCVViewer && formData.cv.fileData && (
        <CVViewer
          cv={formData.cv}
          onClose={() => setShowCVViewer(false)}
        />
      )}

      {showPhotoViewer && formData.profilePhoto.fileData && (
        <ProfilePhotoViewer
          photo={formData.profilePhoto}
          housemaidName={formData.personalInfo.name}
          onClose={() => setShowPhotoViewer(false)}
        />
      )}

      {showPOLOViewer && formData.poloClearance.fileData && (
        <POLOClearanceViewer
          clearance={formData.poloClearance}
          housemaidName={formData.personalInfo.name}
          onClose={() => setShowPOLOViewer(false)}
        />
      )}

      {showAirTicketViewer && formData.airTicket.fileData && (
        <AirTicketViewer
          airTicket={formData.airTicket}
          housemaidName={formData.personalInfo.name}
          onClose={() => setShowAirTicketViewer(false)}
        />
      )}
    </div>
  );
};

export default HousemaidForm;