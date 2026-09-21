using InventoryControl.Application.Abstractions;
using InventoryControl.Domain;
using InventoryControl.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace InventoryControl.Infrastructure.Repositories;

public sealed class DeliveryMethodRepository(InventoryDbContext db) : IDeliveryMethodRepository
{
    public async Task<IReadOnlyList<DeliveryMethod>> ListDeliveryMethodsAsync(CancellationToken cancellationToken = default) =>
        await db.DeliveryMethods.AsNoTracking()
            .OrderBy(x => x.Id)
            .ToListAsync(cancellationToken);

    public Task<DeliveryMethod?> GetDeliveryMethodAsync(int id, CancellationToken cancellationToken = default) =>
        db.DeliveryMethods.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<DeliveryMethod> AddDeliveryMethodAsync(DeliveryMethod delivery, CancellationToken cancellationToken = default)
    {
        db.DeliveryMethods.Add(delivery);
        await db.SaveChangesAsync(cancellationToken);
        return delivery;
    }

    public async Task<bool> UpdateDeliveryMethodAsync(DeliveryMethod delivery, CancellationToken cancellationToken = default)
    {
        db.DeliveryMethods.Update(delivery);
        return await db.SaveChangesAsync(cancellationToken) > 0;
    }

    public async Task<bool> DeleteDeliveryMethodAsync(int id, CancellationToken cancellationToken = default)
    {
        var delivery = await db.DeliveryMethods.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (delivery is null) return false;
        db.DeliveryMethods.Remove(delivery);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<PaymentMethod>> ListPaymentsAsync(int deliveryMethodId, CancellationToken cancellationToken = default) =>
        await db.PaymentMethods.AsNoTracking()
            .Where(x => x.DeliveryMethodId == deliveryMethodId)
            .OrderBy(x => x.Id)
            .ToListAsync(cancellationToken);

    public Task<PaymentMethod?> GetPaymentMethodAsync(int id, CancellationToken cancellationToken = default) =>
        db.PaymentMethods.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<PaymentMethod> AddPaymentMethodAsync(PaymentMethod payment, CancellationToken cancellationToken = default)
    {
        db.PaymentMethods.Add(payment);
        await db.SaveChangesAsync(cancellationToken);
        return payment;
    }

    public async Task<bool> UpdatePaymentMethodAsync(PaymentMethod payment, CancellationToken cancellationToken = default)
    {
        db.PaymentMethods.Update(payment);
        return await db.SaveChangesAsync(cancellationToken) > 0;
    }

    public async Task<bool> DeletePaymentMethodAsync(int id, CancellationToken cancellationToken = default)
    {
        var payment = await db.PaymentMethods.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (payment is null) return false;
        db.PaymentMethods.Remove(payment);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<DeliveryMethod>> ListLinkedDeliveryMethodsAsync(int shopId, bool includePayments = false, CancellationToken cancellationToken = default)
    {
        var links = db.ShopDeliveryMethods.AsNoTracking().Where(x => x.ShopId == shopId);
        if (includePayments)
        {
            return await links
                .Include(x => x.DeliveryMethod!).ThenInclude(d => d.PaymentMethods)
                .OrderBy(x => x.DeliveryMethodId)
                .Select(x => x.DeliveryMethod!)
                .ToListAsync(cancellationToken);
        }
        return await links
            .OrderBy(x => x.DeliveryMethodId)
            .Select(x => x.DeliveryMethod!)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> SetLinkedDeliveryMethodsAsync(int shopId, IReadOnlyList<int> deliveryMethodIds, CancellationToken cancellationToken = default)
    {
        var wanted = (deliveryMethodIds ?? []).Distinct().ToHashSet();
        var existing = await db.ShopDeliveryMethods
            .Where(x => x.ShopId == shopId)
            .ToListAsync(cancellationToken);

        var toRemove = existing.Where(x => !wanted.Contains(x.DeliveryMethodId)).ToList();
        var toAdd = wanted
            .Where(id => existing.All(x => x.DeliveryMethodId != id) &&
                         db.DeliveryMethods.Any(d => d.Id == id))
            .Select(id => new ShopDeliveryMethod { ShopId = shopId, DeliveryMethodId = id })
            .ToList();

        if (!toAdd.Any() && !toRemove.Any()) return false;

        if (toRemove.Count > 0) db.ShopDeliveryMethods.RemoveRange(toRemove);
        if (toAdd.Count > 0) db.ShopDeliveryMethods.AddRange(toAdd);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> IsCheckoutOptionValidAsync(int shopId, int deliveryMethodId, int paymentMethodId, CancellationToken cancellationToken = default) =>
        await db.ShopDeliveryMethods.AsNoTracking()
            .AnyAsync(
                x => x.ShopId == shopId
                     && x.DeliveryMethodId == deliveryMethodId
                     && x.DeliveryMethod!.IsActive
                     && x.DeliveryMethod!.PaymentMethods.Any(p => p.Id == paymentMethodId && p.IsActive),
                cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => db.SaveChangesAsync(cancellationToken);
}