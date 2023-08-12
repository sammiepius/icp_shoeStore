import { $query, $update, Record, StableBTreeMap, match,Vec, Result, nat64, ic, float32, int16, Principal, nat32 } from 'azle';
import { v4 as uuidv4 } from 'uuid';

type Shoe = Record<{
    creator: Principal;
    id: string;
    name: string;
    size: string;
    shoeURL: string;
    price: int16;
    quantity: string;
    rating: float32;
    ratingCount: nat32;
    createdAt: nat64;
    updatedAt: nat64;
}>;

type ShoePayload = Record<{
    name: string;
    size: string;
    shoeURL: string;
    price: int16;
    quantity: string;
}>;

const shoeStorage = new StableBTreeMap<string, Shoe>(0, 44, 1024);


// gets all the shoes in the store
$query
export function getShoes(): Vec<Shoe> {
    return shoeStorage.values();
}

//gets a particular shoe using the shoe's id
$query
export function getShoe(id: string): Result<Shoe,string> {
    return match(shoeStorage.get(id),{
        Some: (shoe) => Result.Ok<Shoe,string>(shoe),
        None: () => Result.Err<Shoe,string>(`shoe with the id=${id} not found.`)
    })
}


$update;
export function createShoe(payload: ShoePayload): Result<Shoe, string> {
    const shoe: Shoe = {creator:ic.caller(), id: uuidv4(), createdAt: ic.time(), rating: 0, updatedAt: ic.time(), ratingCount: 0, ...payload };
    shoeStorage.insert(shoe.id, shoe);
    return Result.Ok(shoe);
}


//function that search for a shoe product
$query;
export function searchShoeProduct(keyword: string): Result<Vec<Shoe>, string> {
    const result = shoeStorage.values().filter((shoe) => {
//variable that uses the "name" keyword to search for a particular shoes      
        const value = shoe.name.includes(keyword)
        return value;
    });
    return Result.Ok<Vec<Shoe>, string>(result);
}


// Function for rating a shoe
$update;
export function rateShoe(id: string, rate: float32): Result<Shoe, string> {
    // Make sure the rating range is not less than 1 or greater than 5
    if (rate < 1 || rate > 5) {
        return Result.Err<Shoe, string>(
            `Error rating shoe with the id=${id}. Invalid rating value. Value should be between 1 and 5.`
        );
    }

    // Gets the shoe details by its id
    const shoe = match(shoeStorage.get(id), {
        Some: (shoe) => Result.Ok<Shoe,string>(shoe),
        None: () => Result.Err<Shoe, string>(`Error rating shoe with the id=${id}. Shoe not found.`)
    });

    if(!shoe.Ok){
        return Result.Err<Shoe, string>(shoe.Err)
    }

    const updatedShoe: Shoe = {
        ...shoe.Ok,
        rating: shoe.Ok.rating + rate,
        ratingCount: shoe.Ok.ratingCount + 1,
        updatedAt: ic.time(),
    };

    shoeStorage.insert(updatedShoe.id, updatedShoe);
    return Result.Ok<Shoe, string>(updatedShoe);
}


//delete a specific show using the show id
$update;
export function deleteShoe(id: string): Result<Shoe, string> {
    return match(shoeStorage.get(id), {
        Some: (shoe) => {
            if(shoe.creator.toString() !== ic.caller().toString()){
                return Result.Err<Shoe, string>("You are not the creator of this shoe")
            }
            shoeStorage.remove(id);
            return Result.Ok<Shoe, string>(shoe)
        },
        None: () => Result.Err<Shoe, string>(`couldn't delete a shoe with id=${id}. shoe not found.`)
    });
}



$update;
export function updateStore(id: string, payload: ShoePayload): Result<Shoe, string> {
    return match(shoeStorage.get(id), {
        Some: (shoe) => {
            if(shoe.creator.toString() !== ic.caller().toString()){
                return Result.Err<Shoe, string>("You are not the creator of this shoe")
            }
            const updatedStore: Shoe = {...shoe, ...payload, updatedAt: ic.time()};
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
