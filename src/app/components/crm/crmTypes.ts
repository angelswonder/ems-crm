export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  title?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  status: 'New' | 'Working' | 'Nurturing' | 'Qualified' | 'Unqualified' | 'Converted';
  source?: string;
  rating?: 'Hot' | 'Warm' | 'Cold';
  industry?: string;
  annualRevenue?: number;
  website?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  owner?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  type?: string;
  industry?: string;
  phone?: string;
  fax?: string;
  website?: string;
  annualRevenue?: number;
  numberOfEmployees?: number;
  rating?: 'Hot' | 'Warm' | 'Cold';
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingCountry?: string;
  billingPostalCode?: string;
  description?: string;
  owner?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  accountId?: string;
  accountName?: string;
  title?: string;
  department?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  mailingStreet?: string;
  mailingCity?: string;
  mailingState?: string;
  mailingCountry?: string;
  description?: string;
  owner?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Opportunity {
  id: string;
  name: string;
  accountId?: string;
  accountName?: string;
  stage: string;
  amount?: number;
  closeDate?: string;
  probability?: number;
  type?: string;
  leadSource?: string;
  campaignId?: string;
  description?: string;
  owner?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Case {
  id: string;
  caseNumber?: string;
  subject: string;
  description?: string;
  accountId?: string;
  accountName?: string;
  contactId?: string;
  contactName?: string;
  status: 'New' | 'Working' | 'Escalated' | 'Closed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  type?: string;
  origin?: string;
  resolution?: string;
  owner?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  subject: string;
  status: string;
  priority: string;
  dueDate?: string;
  relatedToType?: string;
  relatedToId?: string;
  relatedToName?: string;
  contactId?: string;
  contactName?: string;
  description?: string;
  owner?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  subject: string;
  startDatetime: string;
  endDatetime: string;
  location?: string;
  isAllDay?: boolean;
  description?: string;
  type?: string;
  relatedToType?: string;
  relatedToId?: string;
  relatedToName?: string;
  owner?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  type?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  budgetedCost?: number;
  actualCost?: number;
  expectedRevenue?: number;
  expectedResponse?: number;
  numberSent?: number;
  description?: string;
  owner?: string;
  createdAt: string;
  updatedAt: string;
}
