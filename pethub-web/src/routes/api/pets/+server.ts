import {json, type RequestHandler} from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
    const pets = [{
        id: 1,
        name: 'Suerte',
        species: 'Cat',
    }];

    return json(pets);
}