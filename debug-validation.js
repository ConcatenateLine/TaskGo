// Debug validation service
import { ValidationService } from './src/app/shared/services/validation.service.ts';

const validation = new ValidationService();

// Test if script tag is detected
const testInput = '<script>alert("xss")</script>';
const result = validation.validateTaskDescription(testInput);

console.log('Input:', testInput);
console.log('Result:', result);