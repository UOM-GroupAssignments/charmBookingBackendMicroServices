import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsArray,
  ArrayNotEmpty,
  IsDateString,
  Matches,
} from 'class-validator';

export class CreateSalonWorkerDto {

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  salonId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  services: string[];
}

export class SalonWorkerLeaveDto {

  @IsDateString()
  date: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime: string;
}
