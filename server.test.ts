import request from 'supertest';
import { app, validateUser } from './server';
import { jest } from '@jest/globals';
import { Response } from 'node-fetch';

const mockFetch = jest.spyOn(global, 'fetch');

// Added the necessary type definition for the test file
type ValidationResult = {
    name: string;
    status: number;
    message: string;
};

const mockSuccessfulValidation = (name: string, status: number = 200, message: string = 'Validation successful') => {
    mockFetch.mockResolvedValueOnce({
        status: status,
        statusText: status === 200 ? 'OK' : 'Bad Request', // Added statusText for compliance
        headers: { get: () => 'application/json' } as any, // Added minimal Headers object
        json: async () => ({ name, message }),
        text: async () => JSON.stringify({ name, message }),
        ok: status === 200,
    } as any); // FIX: Changed casting to 'as any' to suppress strict TypeScript errors on the Response type
};

jest.mock('node:fs', () => ({
    promises: {
        readFile: jest.fn(async (_path, _encoding) => {
            return JSON.stringify([
                "Aminah Bello",
                "Jason Smith",
                "Luc O‘Connor",
                "María López",
                "T'Challa Udaku",
                "Sara O’Malley",
                "Renee O‘Connor ",
                "Noah Johnson"
            ]);
        }),
    },
}));


describe('Validation Logic Regression', () => {

    beforeEach(() => {
        mockFetch.mockClear(); 
    });
    
    it('should successfully clean and validate a name with a standard apostrophe', async () => {
        const messyName = "T'Challa Udaku";
        const expectedCleanName = "TChalla Udaku";

        mockSuccessfulValidation(expectedCleanName); 

        const result = await validateUser(messyName);

        expect(result.status).toBe(200);
        
        const fetchUrl = mockFetch.mock.calls[0][0] as string;
        expect(fetchUrl).toContain(`name=${encodeURIComponent(expectedCleanName)}`);
    });

    it('should successfully clean and validate a name with curly quotes and whitespace', async () => {
        const messyName = " Renee O‘Connor ";
        const expectedCleanName = "Renee OConnor";

        mockSuccessfulValidation(expectedCleanName);

        const result = await validateUser(messyName);
        
        expect(result.status).toBe(200);
        
        const fetchUrl = mockFetch.mock.calls[0][0] as string;
        expect(fetchUrl).toContain(`name=${encodeURIComponent(expectedCleanName)}`);
    });

    it('should successfully clean and validate a name with accented characters', async () => {
        const accentedName = "María López";
        const expectedCleanName = "Maria Lopez";

        mockSuccessfulValidation(expectedCleanName);

        const result = await validateUser(accentedName);
        
        expect(result.status).toBe(200);
        
        const fetchUrl = mockFetch.mock.calls[0][0] as string;
        expect(fetchUrl).toContain(`name=${encodeURIComponent(expectedCleanName)}`);
    });

    it('/api/validate-users endpoint should process the entire batch without crashing and report all results as successful', async () => {
        for (let i = 0; i < 8; i++) {
            mockSuccessfulValidation(`User${i}`, 200, 'Validated OK');
        }

        const response = await request(app).get('/api/validate-users');

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(8);
        
        // FIX: Cast response.body to the expected type to access 'result.status' safely
        const results = response.body as ValidationResult[]; 
        const allPassed = results.every(result => result.status === 200);
        
        expect(allPassed).toBe(true);
        
        expect(mockFetch).toHaveBeenCalledTimes(8);
    });
});
