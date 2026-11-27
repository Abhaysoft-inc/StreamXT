// export async function GET(request) {
  
//   return new Response(JSON.stringify("hello"), {
//     status: 200,
//     headers: { 'Content-Type': 'application/json' }
//   });


// }


export async function POST(request) {

  const body = await request.json();
  const { name } = body;
  
}