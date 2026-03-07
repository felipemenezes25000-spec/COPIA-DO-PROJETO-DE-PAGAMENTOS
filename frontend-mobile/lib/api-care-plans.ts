import { apiClient } from './api-client';

export interface AiSuggestionResponse {
  id: string;
  consultationId: string;
  patientId: string;
  doctorId?: string | null;
  status: string;
  model: string;
  payloadJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcceptedExam {
  name: string;
  priority: 'optional' | 'recommended' | 'urgent';
  instructions?: string;
  notes?: string;
}

export interface CarePlanTaskFile {
  id: string;
  taskId: string;
  fileUrl: string;
  contentType: string;
  createdAt: string;
}

export interface CarePlanTask {
  id: string;
  carePlanId: string;
  type: string;
  state: string;
  title: string;
  description?: string;
  payloadJson: string;
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
  files: CarePlanTaskFile[];
}

export interface CarePlan {
  id: string;
  consultationId: string;
  patientId: string;
  responsibleDoctorId: string;
  status: string;
  createdFromAiSuggestionId: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  tasks: CarePlanTask[];
}

export interface CreateCarePlanRequest {
  aiSuggestionId: string;
  responsibleDoctorId: string;
  acceptedExams: AcceptedExam[];
  inPersonRecommendation?: {
    confirmed: boolean;
    urgency?: 'now' | 'today' | 'this_week';
    message?: string;
  };
  createTasks: boolean;
  correlationId: string;
}

export async function getAiExamSuggestions(consultationId: string, status?: string): Promise<AiSuggestionResponse[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiClient.get(`/api/consultations/${consultationId}/ai/exam-suggestions${query}`);
}

export async function createCarePlanFromSuggestion(
  consultationId: string,
  data: CreateCarePlanRequest,
): Promise<{ carePlanId: string; status: string; carePlan: CarePlan }> {
  return apiClient.post(`/api/consultations/${consultationId}/care-plans`, data);
}

export async function getCarePlan(carePlanId: string): Promise<CarePlan> {
  return apiClient.get(`/api/care-plans/${carePlanId}`);
}

export async function carePlanTaskAction(
  carePlanId: string,
  taskId: string,
  action: 'start' | 'complete' | 'submit_results' | 'add_file',
): Promise<CarePlan> {
  return apiClient.post(`/api/care-plans/${carePlanId}/tasks/${taskId}/actions`, { action });
}

export async function uploadCarePlanTaskFile(
  carePlanId: string,
  taskId: string,
  file: { uri: string; type: string; name: string },
): Promise<CarePlanTaskFile> {
  const formData = new FormData();
  formData.append('file', file as unknown as Blob);
  return apiClient.post(`/api/care-plans/${carePlanId}/tasks/${taskId}/files`, formData, true);
}

export async function reviewCarePlan(
  carePlanId: string,
  data: { notes?: string; closePlan: boolean; taskDecisions: { taskId: string; decision: string; reason?: string }[] },
): Promise<CarePlan> {
  return apiClient.post(`/api/care-plans/${carePlanId}/review`, data);
}
