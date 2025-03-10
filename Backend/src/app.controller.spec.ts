import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { Response } from 'express';
import { join } from 'path';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should serve index.html', () => {
      const mockResponse = {
        sendFile: jest.fn(() => {}),
      } as unknown as Response;

      // Use an arrow function
      const getFrontendBound = (res: Response): void => {
        appController.getFrontend(res);
      };

      getFrontendBound(mockResponse);

      expect(mockResponse.sendFile.bind(mockResponse)).toHaveBeenCalledWith(
        join(__dirname, '..', 'public', 'index.html'),
      );
    });
  });
});
