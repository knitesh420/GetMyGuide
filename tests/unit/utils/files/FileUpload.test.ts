import FileUpload, { ONLY_MEDIA_ALLOWED } from '@utils/files/FileUpload';
import {
	createMockRequest,
	createMockResponse,
	createMockFile,
} from '../../../helpers/testHelpers';
import multer from 'multer';

jest.mock('multer');

describe('FileUpload', () => {
	let mockRequest: any;
	let mockResponse: any;

	beforeEach(() => {
		mockRequest = createMockRequest();
		mockResponse = createMockResponse();
		jest.clearAllMocks();
		(global as any).__basedir = '/test/base/dir';
	});

	describe('SingleFileUpload', () => {
		it('should successfully upload a single file', async () => {
			const mockFile = createMockFile();
			mockRequest.file = mockFile;

			const mockMulterInstance = {
				single: jest.fn().mockImplementation((_fieldName) => {
					return (req: any, res: any, cb: any) => {
						cb(null);
					};
				}),
			};

			(multer as any).mockReturnValue(mockMulterInstance);

			const result = await FileUpload.SingleFileUpload(mockRequest, mockResponse, {
				field_name: 'file',
				options: {},
			});

			expect(result).toEqual({
				filename: mockFile.filename,
				destination: mockFile.destination,
				path: mockFile.path,
			});
		});

		it('should reject when multer returns an error', async () => {
			const mockError = new Error('Upload error');
			const mockMulterInstance = {
				single: jest.fn().mockImplementation(() => {
					return (req: any, res: any, cb: any) => {
						cb(mockError);
					};
				}),
			};

			(multer as any).mockReturnValue(mockMulterInstance);

			await expect(
				FileUpload.SingleFileUpload(mockRequest, mockResponse, {
					field_name: 'file',
					options: {},
				})
			).rejects.toThrow('Upload error');
		});

		it('should reject when no file is uploaded', async () => {
			mockRequest.file = undefined;

			const mockMulterInstance = {
				single: jest.fn().mockImplementation(() => {
					return (req: any, res: any, cb: any) => {
						cb(null);
					};
				}),
			};

			(multer as any).mockReturnValue(mockMulterInstance);

			await expect(
				FileUpload.SingleFileUpload(mockRequest, mockResponse, {
					field_name: 'file',
					options: {},
				})
			).rejects.toThrow('No files uploaded.');
		});

		it('should use custom field name', async () => {
			const mockFile = createMockFile();
			mockRequest.file = mockFile;

			const mockMulterInstance = {
				single: jest.fn().mockImplementation((fieldName) => {
					expect(fieldName).toBe('customField');
					return (req: any, res: any, cb: any) => {
						cb(null);
					};
				}),
			};

			(multer as any).mockReturnValue(mockMulterInstance);

			await FileUpload.SingleFileUpload(mockRequest, mockResponse, {
				field_name: 'customField',
				options: {},
			});

			expect(mockMulterInstance.single).toHaveBeenCalledWith('customField');
		});
	});

	describe('MultiFileUpload', () => {
		it('should successfully upload multiple files', async () => {
			const mockFiles = [createMockFile(), createMockFile({ filename: 'file2.jpg' })];
			mockRequest.files = mockFiles;

			const mockMulterInstance = {
				fields: jest.fn().mockImplementation(() => {
					return (req: any, res: any, cb: any) => {
						cb(null);
					};
				}),
			};

			(multer as any).mockReturnValue(mockMulterInstance);

			const result = await FileUpload.MultiFileUpload(mockRequest, mockResponse, {
				field_names: ['file1', 'file2'],
				options: {},
			});

			expect(result).toHaveLength(2);
			expect(result[0].filename).toBe(mockFiles[0].filename);
			expect(result[1].filename).toBe(mockFiles[1].filename);
		});

		it('should reject when multer returns an error', async () => {
			const mockError = new Error('Upload error');
			const mockMulterInstance = {
				fields: jest.fn().mockImplementation(() => {
					return (req: any, res: any, cb: any) => {
						cb(mockError);
					};
				}),
			};

			(multer as any).mockReturnValue(mockMulterInstance);

			await expect(
				FileUpload.MultiFileUpload(mockRequest, mockResponse, {
					field_names: ['file1'],
					options: {},
				})
			).rejects.toThrow('Upload error');
		});

		it('should reject when no files are uploaded', async () => {
			mockRequest.files = undefined;

			const mockMulterInstance = {
				fields: jest.fn().mockImplementation(() => {
					return (req: any, res: any, cb: any) => {
						cb(null);
					};
				}),
			};

			(multer as any).mockReturnValue(mockMulterInstance);

			await expect(
				FileUpload.MultiFileUpload(mockRequest, mockResponse, {
					field_names: ['file1'],
					options: {},
				})
			).rejects.toThrow('No files uploaded.');
		});

		it('should map field names correctly', async () => {
			const mockFiles = [createMockFile()];
			mockRequest.files = mockFiles;

			const mockMulterInstance = {
				fields: jest.fn().mockImplementation((fieldsConfig) => {
					expect(fieldsConfig).toEqual([
						{ name: 'field1', maxCount: 1 },
						{ name: 'field2', maxCount: 1 },
					]);
					return (req: any, res: any, cb: any) => {
						cb(null);
					};
				}),
			};

			(multer as any).mockReturnValue(mockMulterInstance);

			await FileUpload.MultiFileUpload(mockRequest, mockResponse, {
				field_names: ['field1', 'field2'],
				options: {},
			});
		});
	});

	describe('ONLY_MEDIA_ALLOWED', () => {
		it('should allow PNG images', () => {
			const file = createMockFile({ mimetype: 'image/png' });
			const cb = jest.fn();

			ONLY_MEDIA_ALLOWED(mockRequest, file, cb);

			expect(cb).toHaveBeenCalledWith(null, true);
		});

		it('should allow JPEG images', () => {
			const file = createMockFile({ mimetype: 'image/jpeg' });
			const cb = jest.fn();

			ONLY_MEDIA_ALLOWED(mockRequest, file, cb);

			expect(cb).toHaveBeenCalledWith(null, true);
		});

		it('should allow JPG images', () => {
			const file = createMockFile({ mimetype: 'image/jpg' });
			const cb = jest.fn();

			ONLY_MEDIA_ALLOWED(mockRequest, file, cb);

			expect(cb).toHaveBeenCalledWith(null, true);
		});

		it('should allow WEBP images', () => {
			const file = createMockFile({ mimetype: 'image/webp' });
			const cb = jest.fn();

			ONLY_MEDIA_ALLOWED(mockRequest, file, cb);

			expect(cb).toHaveBeenCalledWith(null, true);
		});

		it('should allow MP4 videos', () => {
			const file = createMockFile({ mimetype: 'video/mp4' });
			const cb = jest.fn();

			ONLY_MEDIA_ALLOWED(mockRequest, file, cb);

			expect(cb).toHaveBeenCalledWith(null, true);
		});

		it('should reject PDF files', () => {
			const file = createMockFile({ mimetype: 'application/pdf' });
			const cb = jest.fn();

			ONLY_MEDIA_ALLOWED(mockRequest, file, cb);

			expect(cb).toHaveBeenCalled();
			const error = cb.mock.calls[0][0] as Error;
			expect(error).toBeInstanceOf(Error);
			expect(error.message).toBe('Only JPG, PNG, WEBP, MP4  images are allowed');
		});

		it('should reject text files', () => {
			const file = createMockFile({ mimetype: 'text/plain' });
			const cb = jest.fn();

			ONLY_MEDIA_ALLOWED(mockRequest, file, cb);

			expect(cb).toHaveBeenCalled();
			const error = cb.mock.calls[0][0] as Error;
			expect(error).toBeInstanceOf(Error);
			expect(error.message).toBe('Only JPG, PNG, WEBP, MP4  images are allowed');
		});
	});
});
