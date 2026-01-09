import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // Proxy to Manager Service
        const res = await fetch('http://localhost:3001/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            throw new Error(`Manager responded with ${res.status}`);
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Proxy Error:', error);
        return NextResponse.json({ text: "Error connecting to Hotel Services." }, { status: 500 });
    }
}
