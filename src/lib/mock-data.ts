
export interface ChecklistItem {
  id: string;
  qr_code_data: string; // Data encoded in QR
  part_name: string;
  description: string;
  question: string;
}

// This MOCK_CHECKLIST_ITEMS will be effectively unused if checklist items are fetched from API
// It can be removed or kept for local development fallback if API is unavailable.
// For this migration, it's assumed API is the source of truth, so this becomes less relevant.
export const MOCK_CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: '1', qr_code_data: 'TIRES_FRONT_LEFT', part_name: 'Front Left Tire', description: 'Inspect for wear, damage, and proper inflation.', question: 'Is the Front Left Tire in good condition?' },
  { id: '2', qr_code_data: 'TIRES_FRONT_RIGHT', part_name: 'Front Right Tire', description: 'Inspect for wear, damage, and proper inflation.', question: 'Is the Front Right Tire in good condition?' },
  { id: '3', qr_code_data: 'BRAKES_MAIN', part_name: 'Brakes', description: 'Test brake pedal and parking brake functionality.', question: 'Are the brakes functioning correctly?' },
  { id: '4', qr_code_data: 'LIGHTS_HEAD', part_name: 'Headlights', description: 'Ensure headlights are clean and operational.', question: 'Are the headlights working?' },
  { id: '5', qr_code_data: 'FORKS_MAIN', part_name: 'Forks', description: 'Check for cracks, bends, or excessive wear.', question: 'Are the forks in good condition?' },
  { id: '6', qr_code_data: 'HORN_OPERATIONAL', part_name: 'Horn', description: 'Test horn for proper operation.', question: 'Is the horn working correctly?' },
  { id: '7', qr_code_data: 'SEATBELT_CONDITION', part_name: 'Seatbelt', description: 'Inspect seatbelt for wear and tear, ensure it latches securely.', question: 'Is the seatbelt in good condition and functional?' },
  { id: '8', qr_code_data: 'FLUID_LEVELS', part_name: 'Fluid Levels', description: 'Check hydraulic fluid, engine oil (if applicable), and coolant levels.', question: 'Are all fluid levels adequate?' },
  { id: '9', qr_code_data: 'STEERING_SYSTEM', part_name: 'Steering', description: 'Check for smooth and responsive steering operation.', question: 'Is the steering system operating smoothly?' },
  { id: '10', qr_code_data: 'SAFETY_DECALS', part_name: 'Safety Decals', description: 'Ensure all safety warning decals are present and legible.', question: 'Are all safety decals in place and readable?' },
];

export interface InspectionRecordClientState {
  checklistItemId: string;
  part_name: string; 
  question: string; 
  is_safe: boolean | null; 
  photo_url: string | null; 
  timestamp: string | null;
  completed: boolean;
  remarks?: string | null; 
}

export const PLACEHOLDER_IMAGE_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
