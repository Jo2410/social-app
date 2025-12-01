import {
  DeleteResult,
  MongooseUpdateQueryOptions,
  Types,
  UpdateQuery,
  UpdateWriteOpResult,
} from "mongoose";
import { PopulateOptions } from "mongoose";
import {
  CreateOptions,
  FlattenMaps,
  HydratedDocument,
  Model,
  ProjectionType,
  QueryOptions,
  RootFilterQuery,
} from "mongoose";

export type Lean<T> = HydratedDocument<FlattenMaps<T>>;

export abstract class DatabaseRepository<TDocument> {
  constructor(protected readonly model: Model<TDocument>) {}

  async findOne({
    filter,
    select,
    options,
  }: {
    filter?: RootFilterQuery<TDocument>;
    select?: ProjectionType<TDocument> | null;
    options?: QueryOptions<TDocument> | null;
  }): Promise<Lean<TDocument> | HydratedDocument<TDocument> | null> {
    const doc = this.model.findOne(filter).select(select || "");
    if (options?.populate) {
      doc.populate(options.populate as PopulateOptions[]);
    }

    if (options?.lean) {
      doc.lean(options.lean);
    }
    return await doc.exec();
  }

  async find({
    filter,
    select,
    options,
  }: {
    filter?: RootFilterQuery<TDocument>;
    select?: ProjectionType<TDocument> | undefined;
    options?: QueryOptions<TDocument> | undefined;
  }): Promise<Lean<TDocument[]> | HydratedDocument<TDocument>[] | []> {
    const doc = this.model.find(filter || {}).select(select || "");
    if (options?.populate) {
      doc.populate(options.populate as PopulateOptions[]);
    }

    if (options?.skip) {
      doc.skip(options.skip);
    }

    if (options?.limit) {
      doc.limit(options.limit);
    }

    if (options?.lean) {
      doc.lean(options.lean);
    }

    return await doc.exec();
  }

  async paginate({
    filter = {},
    select,
    options = {},
    page = "all",
    size = 5,
  }: {
    filter?: RootFilterQuery<TDocument>;
    select?: ProjectionType<TDocument> | undefined;
    options?: QueryOptions<TDocument> | undefined;
    page?: number | "all";
    size?: number;
  }): Promise<Lean<TDocument[]> | HydratedDocument<TDocument>[] | any> {
    let docsCount: number | undefined = undefined;
    let pages: number | undefined = undefined;

    if (page !== "all") {
      page = Math.floor(page < 1 ? 1 : page);
      options.limit = Math.floor(size < 1 || !size ? 5 : size);
      options.skip = (page - 1) * options.limit;

      docsCount = await this.model.countDocuments(filter);
      pages = Math.ceil(docsCount / options.limit);
    }

    const result = await this.find({ filter, select, options });

    return {
      docsCount,
      limit: options.limit,
      pages,
      currentPage: page,
      result,
    };
  }

  async findById({
    id,
    select,
    options,
  }: {
    id: Types.ObjectId;
    select?: ProjectionType<TDocument> | null;
    options?: QueryOptions<TDocument> | null;
  }): Promise<Lean<TDocument> | HydratedDocument<TDocument> | null> {
    const doc = this.model.findById(id).select(select || "");
    if (options?.populate) {
      doc.populate(options.populate as PopulateOptions[]);
    }

    if (options?.lean) {
      doc.lean(options.lean);
    }
    return await doc.exec();
  }

  async create({
    data,
    options,
  }: {
    data: Partial<TDocument>[];
    options?: CreateOptions | undefined;
  }): Promise<HydratedDocument<TDocument>[] | undefined> {
    return await this.model.create(data, options);
  }

  async insertMany({
    data,
  }: {
    data: Partial<TDocument>[];
    options?: CreateOptions | undefined;
  }): Promise<HydratedDocument<TDocument>[]> {
    return (await this.model.insertMany(data)) as HydratedDocument<TDocument>[];
  }

  async updateOne({
    filter,
    update = { new: true },
    options,
  }: {
    filter: RootFilterQuery<TDocument>;
    update: UpdateQuery<TDocument>;
    options?: MongooseUpdateQueryOptions<TDocument> | null;
  }): Promise<UpdateWriteOpResult> {
    if (Array.isArray(update)) {
      update.push({
        $set: {
          __v: { $add: ["$__v", 1] },
        },
      });
      return await this.model.updateOne(filter || {}, update, options);
    }
    return await this.model.updateOne(
      filter,
      { ...update, $inc: { __v: 1 } },
      options
    );
  }

  async findByIdAndUpdate({
    id,
    update,
    options,
  }: {
    id?: Types.ObjectId;
    update: UpdateQuery<TDocument>;
    options?: MongooseUpdateQueryOptions<TDocument> | null;
  }): Promise<HydratedDocument<TDocument> | Lean<TDocument> | null> {
    return await this.model.findByIdAndUpdate(
      id,
      { ...update, $inc: { __v: 1 } },
      options
    );
  }

  async findOneAndUpdate({
    filter,
    update,
    options,
  }: {
    filter?: RootFilterQuery<TDocument>;
    update: UpdateQuery<TDocument>;
    options?: MongooseUpdateQueryOptions<TDocument> | null;
  }): Promise<HydratedDocument<TDocument> | Lean<TDocument> | null> {
    return await this.model.findOneAndUpdate(
      filter,
      { ...update, $inc: { __v: 1 } },
      options
    );
  }

  async deleteOne({
    filter,
  }: {
    filter: RootFilterQuery<TDocument>;
  }): Promise<DeleteResult> {
    return this.model.deleteOne(filter);
  }

  async deleteMany({
    filter,
  }: {
    filter: RootFilterQuery<TDocument>;
  }): Promise<DeleteResult> {
    return this.model.deleteMany(filter);
  }

  async findOneAndDelete({
    filter,
  }: {
    filter: RootFilterQuery<TDocument>;
  }): Promise<HydratedDocument<TDocument> | null> {
    return this.model.findOneAndDelete(filter);
  }
}
