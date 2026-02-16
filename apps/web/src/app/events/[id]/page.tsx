export default async function Chika({ params }: { params: Promise<{ id: string }> }) {
    const id = (await params).id;

	return <h1>Chika id: {id}</h1>;
}
