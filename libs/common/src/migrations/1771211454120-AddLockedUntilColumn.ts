import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLockedUntilColumn1708041600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE super_admin ADD COLUMN lockedUntil TIMESTAMP NULL DEFAULT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE super_admin DROP COLUMN lockedUntil`);
  }
}