<?php

declare(strict_types=1);

it('responds to CORS preflight requests', function () {
    $response = $this->call('OPTIONS', '/api/v1/event-types', [], [], [], [
        'HTTP_ORIGIN' => 'http://localhost:5173',
        'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
        'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'Content-Type',
    ]);

    $response->assertNoContent()
        ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
        ->assertHeader('Access-Control-Allow-Methods');
});

it('includes CORS headers on regular requests', function () {
    $response = $this->getJson('/api/v1/event-types', ['Origin' => 'http://localhost:5173']);

    $response->assertOk()
        ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
});
