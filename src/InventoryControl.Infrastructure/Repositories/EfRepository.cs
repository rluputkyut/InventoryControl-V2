using InventoryControl.Application.Abstractions;
using InventoryControl.Domain;
using InventoryControl.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryControl.Infrastructure.Repositories;

public class EfRepository<T>(InventoryDbContext db) : IRepository<T> where T : NamedEntity
{
    protected readonly InventoryDbContext Db = db;
    public async Task<IReadOnlyList<T>> ListAsync(CancellationToken cancellationToken, int? shopId)
    {
        IQueryable<T> query = db.Set<T>().AsNoTracking();
        if (typeof(IShopScopedEntity).IsAssignableFrom(typeof(T)) && shopId is int sid)
            query = query.Where(x => ((IShopScopedEntity)x!).ShopId == sid);
        return await query.OrderBy(x => x.Name).ToListAsync(cancellationToken);
    }
    public async Task<IReadOnlyList<T>> ListAsync(CancellationToken cancellationToken = default) => await db.Set<T>().AsNoTracking().OrderBy(x => x.Name).ToListAsync(cancellationToken);
    public Task<T?> GetByIdAsync(int id, CancellationToken cancellationToken = default) => db.Set<T>().AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
    public async Task<T> AddAsync(T entity, CancellationToken cancellationToken = default) { db.Set<T>().Add(entity); await db.SaveChangesAsync(cancellationToken); return entity; }
    public async Task<bool> UpdateAsync(T entity, CancellationToken cancellationToken = default)
    {
        if (!await db.Set<T>().AnyAsync(x => x.Id == entity.Id, cancellationToken)) return false;
        db.Entry(entity).State = EntityState.Modified; await db.SaveChangesAsync(cancellationToken); return true;
    }
    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var entity = await db.Set<T>().FindAsync([id], cancellationToken); if (entity is null) return false;
        db.Set<T>().Remove(entity); await db.SaveChangesAsync(cancellationToken); return true;
    }
}
