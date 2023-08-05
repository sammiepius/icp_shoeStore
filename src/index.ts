import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt, int, float32, int8, int16 } from 'azle';
import { v4 as uuidv4 } from 'uuid';

type Shoe = Record<{
    id: string;
    name: string;
    size: string;
    shoeURL: string;
    price: int16;
    quantity: string;
    rating: float32;
    createdAt: nat64;
    updatedAt: nat64; // Use nat64 instead of Opt<nat64> for consistency
}>;

type ShoePayload = Record<{
    name: string;
    size: string;
    shoeURL: string;
    price: int16;
    quantity: string;
    // rating: float32; // Remove rating from the payload, as it will be set to 1.0 in createShoe
}>;

const shoeStorage = new StableBTreeMap<string, Shoe>(0, 44, 1024);

$update;
export function createShoe(payload: ShoePayload): Result<Shoe, string> {
    const shoe: Shoe = { id: uuidv4(), createdAt: ic.time(), rating: 1.0, updatedAt: ic.time(), ...payload };
    shoeStorage.insert(shoe.id, shoe);
    return Result.Ok(shoe);
}

// ... (other functions remain the same)

// Function for rating a shoe
$update;
export function rateShoe(id: string, rate: float32): Result<Shoe, string> {
    // Make sure the rating range is not less than 0 or greater than 4
    if (rate < 0 || rate > 4) {
        return Result.Err<Shoe, string>(
            `Error rating shoe with the id=${id}. Invalid rating value. Value should be between 0 and 4.`
        );
    }

    // Gets the shoe details by its id
    const shoe = match(shoeStorage.get(id), {
        Some: (shoe) => shoe,
        None: () => return Result.Err<Shoe, string>(`Error rating shoe with the id=${id}. Shoe not found.`)
    });

    // Calculate the new rating by clamping the value between 0 and 4
    const rating = Math.max(0, Math.min(4, (shoe.rating + rate)));

    const updatedShoe: Shoe = {
        ...shoe,
        rating,
        updatedAt: ic.time(),
    };

    shoeStorage.insert(updatedShoe.id, updatedShoe);
    return Result.Ok<Shoe, string>(updatedShoe);
}

//delete a specific show using the show id
$update;
export function deleteShoe(id: string): Result<Shoe, string> {
    return match(shoeStorage.remove(id), {
        Some: (deletedShoe) => Result.Ok<Shoe, string>(deletedShoe),
        None: () => Result.Err<Shoe, string>(`couldn't delete a shoe with id=${id}. shoe not found.`)
    });
}



$update;
export function updateStore(id: string, payload: ShoePayload): Result<Shoe, string> {
    return match(shoeStorage.get(id), {
        Some: (shoe) => {
            const updatedStore: Shoe = {...shoe, ...payload, updatedAt: Opt.Some(ic.time())};
            shoeStorage.insert(shoe.id, updatedStore);
            return Result.Ok<Shoe, string>(updatedStore);
        },
        None: () => Result.Err<Shoe, string>(`couldn't update a shoe with id=${id}. shoe not found`)
    });
}

// a workaround to make uuid package work with Azle
globalThis.crypto = {
    getRandomValues: () => {
        let array = new Uint8Array(32);

        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }

        return array;
    }
};

