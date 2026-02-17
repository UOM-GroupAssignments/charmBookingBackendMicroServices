import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsDateString,
  Matches,
  IsNumber,
  Min,
  Max,
  IsUUID,
} from 'class-validator';

export class LoginUserDto {

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(50)
  password: string;
}

export class LoginUserResponseDTO {
  customerId: string;
  email: string;
  firstName: string;
  lastName: string;
  token: string;
}

export class UserDetailsDTO {

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName: string;

  @IsDateString()
  dateOfBirth: string;

  @Matches(/^[0-9]{10}$/, {
    message: 'Phone number must contain exactly 10 digits',
  })
  phone: string;
}

export class UpdatePasswordDto {

  @IsString()
  @MinLength(6)
  oldPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class CreateReviewDto {

  @IsUUID()
  salonId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  comment: string;
}
