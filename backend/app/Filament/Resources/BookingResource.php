<?php

declare(strict_types=1);

namespace App\Filament\Resources;

use App\Enums\BookingStatus;
use App\Filament\Resources\BookingResource\Pages;
use App\Models\Booking;
use Filament\Actions\Action;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TimePicker;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class BookingResource extends Resource
{
    protected static ?string $model = Booking::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-clipboard-document-list';

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('event_type_id')
                    ->relationship('eventType', 'name')
                    ->required(),
                Select::make('guest_id')
                    ->relationship('guest', 'email')
                    ->required(),
                DatePicker::make('date')
                    ->required(),
                TimePicker::make('start_time')
                    ->required()
                    ->seconds(false),
                DateTimePicker::make('starts_at')
                    ->required(),
                DateTimePicker::make('ends_at')
                    ->required(),
                Textarea::make('comment')
                    ->maxLength(65535)
                    ->columnSpanFull(),
                Select::make('status')
                    ->options(BookingStatus::class)
                    ->required(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('booking_group_id')
                    ->searchable(),
                Tables\Columns\TextColumn::make('eventType.name')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('guest.email')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('date')
                    ->date()
                    ->sortable(),
                Tables\Columns\TextColumn::make('start_time'),
                Tables\Columns\TextColumn::make('status')
                    ->badge(),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->defaultGroup('booking_group_id')
            ->filters([
                SelectFilter::make('event_type_id')
                    ->relationship('eventType', 'name'),
                Tables\Filters\Filter::make('date')
                    ->form([
                        DatePicker::make('date')->label('Date'),
                    ])
                    ->query(function (Builder $query, array $data): void {
                        if (filled($data['date'])) {
                            $query->whereDate('date', $data['date']);
                        }
                    }),
            ])
            ->actions([
                Action::make('confirm')
                    ->label('Подтвердить')
                    ->icon('heroicon-o-check')
                    ->color('success')
                    ->requiresConfirmation()
                    ->visible(fn (Booking $record): bool => $record->isPending())
                    ->action(function (Booking $record): void {
                        $record->update(['status' => BookingStatus::CONFIRMED]);
                    }),
                Action::make('cancel')
                    ->label('Отменить')
                    ->icon('heroicon-o-x-mark')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->visible(fn (Booking $record): bool => ! $record->isCancelled())
                    ->action(function (Booking $record): void {
                        $record->update(['status' => BookingStatus::CANCELLED]);
                    }),
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ManageBookings::route('/'),
        ];
    }
}
